import { NextResponse } from "next/server";
import { analyzeSafetyObservation, checkAiStatus } from "@/lib/ollama";
import { addConcernFromWorker } from "@/lib/concerns";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max execution time for Vercel serverless

/**
 * Health check endpoint: GET /api/analyze
 * Returns dual-engine status (Fine-Tuned Modal SLM & Local Ollama) and active routing.
 */
export async function GET() {
  const status = await checkAiStatus();

  return NextResponse.json(
    {
      online: status.online,
      targetModelFound:
        status.activeEngine === "modal"
          ? status.modal.online
          : status.ollama.targetModelFound,
      model:
        status.activeEngine === "modal"
          ? "Fine-Tuned SLM (Modal Cloud)"
          : status.ollama.model,
      activeEngine: status.activeEngine,
      preferredEngine: status.preferredEngine,
      environment: status.environment,
      modal: status.modal,
      ollama: status.ollama,
    },
    {
      status: status.online ? 200 : 503,
    }
  );
}

/**
 * Extraction endpoint: POST /api/analyze
 * Body: { observation: string, autoDispatch?: boolean, engine?: "modal" | "ollama" | "auto", reporter?: any }
 * Analyzes observation using Modal Cloud SLM or Local Ollama and automatically dispatches
 * the concern to the Manager Portal's 'To Do' board.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { observation, autoDispatch = true, reporter, engine } = body;

    if (!observation || typeof observation !== "string" || !observation.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Observation text is required in request body.",
        },
        { status: 400 }
      );
    }

    const result = await analyzeSafetyObservation(observation, engine);

    // Intelligently forward worker concern to Manager Portal's 'To Do' board
    let concernCard = null;
    if (autoDispatch) {
      try {
        concernCard = await addConcernFromWorker({
          observation: observation.trim(),
          hazard: result.hazard,
          failed_barrier: result.failed_barrier,
          evidence_quote: result.evidence_quote,
          sif_score: result.sif_score,
          sif_potential: result.sif_potential,
          iogp_rule: result.iogp_life_saving_rule,
          critical_barrier_failure: result.critical_barrier_failure,
          inference_engine: result.engine,
          reporter,
        });
      } catch (dispatchErr) {
        console.warn("Could not auto-dispatch concern to manager board:", dispatchErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      concernCard,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal safety analysis error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
