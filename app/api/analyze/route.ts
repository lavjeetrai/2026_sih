import { NextResponse } from "next/server";
import { analyzeSafetyObservation, checkOllamaStatus } from "@/lib/ollama";
import { addConcernFromWorker } from "@/lib/concerns";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint: GET /api/analyze
 * Returns Ollama connectivity and model registration status.
 */
export async function GET() {
  const status = await checkOllamaStatus();
  return NextResponse.json(status, {
    status: status.online ? 200 : 503,
  });
}

/**
 * Extraction endpoint: POST /api/analyze
 * Body: { observation: string, autoDispatch?: boolean }
 * Analyzes observation with fine-tuned Ollama model and automatically dispatches
 * the concern to the Manager Portal's 'To Do' board.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { observation, autoDispatch = true, reporter } = body;

    if (!observation || typeof observation !== "string" || !observation.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Observation text is required in request body.",
        },
        { status: 400 }
      );
    }

    const result = await analyzeSafetyObservation(observation);

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
