import { NextResponse } from "next/server";
import { getBoard, saveBoard, addConcernFromWorker } from "@/lib/data/concerns";
import { getSessionUser } from "@/lib/auth";
import type { ColumnData } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/concerns
 * Server-side authorization & IDOR protection:
 * - Unauthenticated -> 401 Unauthorized
 * - Field Officer (worker) -> Strictly isolated to their own reports (derived from session)
 * - HSE Manager -> Full board access (optional officerEmail filter supported for manager triage)
 */
export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to access safety concerns." },
        { status: 401 }
      );
    }

    const board = await getBoard();

    // 1. FIELD OFFICER ISOLATION (Strict IDOR prevention: ignores spoofed query params)
    if (sessionUser.role === "worker") {
      const userEmail = sessionUser.email.toLowerCase().trim();
      const userBadge = (sessionUser.badgeId || "").toLowerCase().trim();

      const privateBoard = board.map((col) => ({
        ...col,
        cards: (col.cards || []).filter((c) => {
          const repEmail = (c.reporter?.email || "").toLowerCase().trim();
          const repBadge = (c.reporter?.badgeId || "").toLowerCase().trim();

          if (repEmail && userEmail) {
            return repEmail === userEmail;
          }
          if (repBadge && userBadge) {
            return repBadge === userBadge;
          }
          return false;
        }),
      }));

      return NextResponse.json({ success: true, board: privateBoard, isIsolated: true });
    }

    // 2. HSE MANAGER (Full board access, optional filtering by officer for triage)
    const { searchParams } = new URL(req.url);
    const filterEmail = searchParams.get("officerEmail")?.toLowerCase().trim();

    if (filterEmail) {
      const filteredBoard = board.map((col) => ({
        ...col,
        cards: (col.cards || []).filter((c) => {
          const repEmail = (c.reporter?.email || "").toLowerCase().trim();
          return repEmail === filterEmail;
        }),
      }));
      return NextResponse.json({ success: true, board: filteredBoard, isFiltered: true });
    }

    return NextResponse.json({ success: true, board });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load board";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/concerns
 * Appends a worker concern to the 'To Do' column.
 * Derives reporter identity strictly from server-side session.
 */
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to submit safety concerns." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (!body.observation && !body.hazard && !body.title) {
      return NextResponse.json(
        { success: false, error: "Observation or title is required" },
        { status: 400 }
      );
    }

    // Reporter identity derived from authenticated session
    const reporter = {
      name: sessionUser.name,
      role: sessionUser.designation || (sessionUser.role === "manager" ? "HSE Operations Manager" : "HSE Field Safety Officer"),
      email: sessionUser.email,
      station: sessionUser.station,
      radioChannel: sessionUser.radioChannel,
      badgeId: sessionUser.badgeId,
      phone: sessionUser.phone,
      avatarUrl:
        sessionUser.avatarUrl ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    };

    const newCard = await addConcernFromWorker({
      observation: body.observation || body.title,
      hazard: body.hazard,
      failed_barrier: body.failed_barrier,
      failed_barrier_type: body.failed_barrier_type,
      operational_activity: body.operational_activity,
      site_location: body.site_location,
      evidence_quote: body.evidence_quote,
      sif_score: body.sif_score,
      sif_potential: body.sif_potential,
      sif_category: body.sif_category,
      iogp_rule: body.iogp_rule,
      iogp_rules: body.iogp_rules,
      critical_barrier_failure: body.critical_barrier_failure,
      inference_engine: body.inference_engine,
      analysis_engine: body.analysis_engine,
      model_name: body.model_name,
      model_version: body.model_version,
      analyzed_at: body.analyzed_at,
      duplicateFingerprint: body.duplicateFingerprint,
      reporter,
    });

    return NextResponse.json({ success: true, card: newCard });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add concern";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/concerns
 * Updates board state (e.g. moving cards between columns).
 * Strictly requires authorized HSE Manager session.
 */
export async function PATCH(req: Request) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }
    if (sessionUser.role !== "manager") {
      return NextResponse.json(
        { success: false, error: "Access denied. Only HSE Managers may update the board layout." },
        { status: 403 }
      );
    }

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
