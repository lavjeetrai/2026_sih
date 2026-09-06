import { NextResponse } from "next/server";
import { getBoard, saveBoard, addConcernFromWorker, type ColumnData } from "@/lib/concerns";

export const dynamic = "force-dynamic";

/**
 * GET /api/concerns
 * Query params (optional):
 * - officerEmail: strictly filter cards reported by this officer
 * - officerName: strictly filter cards reported by this officer name
 * When no officer param is passed, returns full Kanban board (Manager view).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const officerEmail = searchParams.get("officerEmail")?.toLowerCase().trim();
    const officerName = searchParams.get("officerName")?.toLowerCase().trim();
    const officerBadge = searchParams.get("officerBadge")?.toLowerCase().trim();

    const board = await getBoard();

    // If request is from a Field Officer, strictly isolate to ONLY their own submitted concerns
    if (officerEmail || officerName) {
      const privateBoard = board.map((col) => ({
        ...col,
        cards: (col.cards || []).filter((c) => {
          const repEmail = (c.reporter?.email || "").toLowerCase().trim();
          const repName = (c.reporter?.name || "").toLowerCase().trim();

          // 1. Primary Authority: Unique Officer Email match
          if (officerEmail && repEmail) {
            return repEmail === officerEmail;
          }

          // 2. Secondary fallback: Strict Officer Name match (only if card has no email attached)
          if (officerName && repName && !repEmail) {
            return repName === officerName;
          }

          return false;
        }),
      }));

      return NextResponse.json({ success: true, board: privateBoard, isIsolated: true });
    }

    return NextResponse.json({ success: true, board });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load board";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/concerns
 * Receives a worker concern payload and appends it to the 'To Do' column on the Manager board.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.observation && !body.hazard && !body.title) {
      return NextResponse.json(
        { success: false, error: "Observation or title is required" },
        { status: 400 }
      );
    }

    const newCard = await addConcernFromWorker({
      observation: body.observation || body.title,
      hazard: body.hazard,
      failed_barrier: body.failed_barrier,
      evidence_quote: body.evidence_quote,
      sif_score: body.sif_score,
      reporter: body.reporter,
    });

    return NextResponse.json({ success: true, card: newCard });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add concern";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/concerns
 * Updates board state (e.g. when manager moves cards between To Do, In Progress, and Done).
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.board)) {
      await saveBoard(body.board as ColumnData[]);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "board array is required" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update board";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
