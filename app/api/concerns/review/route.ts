import { NextResponse } from "next/server";
import { reviewConcernCard } from "@/lib/data/concerns";
import { getSessionUser } from "@/lib/auth";
import type { ReviewAuditRecord } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/concerns/review
 * Allows an authorized HSE Manager to review and confirm/correct AI model outputs.
 * Preserves the original AI assessment intact for future evaluation and model retraining.
 */
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to review safety concerns." },
        { status: 401 }
      );
    }
    if (sessionUser.role !== "manager") {
      return NextResponse.json(
        { success: false, error: "Access denied. Only an authorized HSE Manager can perform safety reviews." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { cardId, decision, notes, originalAssessment, correctedAssessment } = body;

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: "cardId is required." },
        { status: 400 }
      );
    }

    if (!decision || !["confirmed", "corrected"].includes(decision)) {
      return NextResponse.json(
        { success: false, error: "Valid decision ('confirmed' or 'corrected') is required." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const auditRecord: ReviewAuditRecord = {
      reviewedBy: {
        name: sessionUser.name,
        email: sessionUser.email,
        badgeId: sessionUser.badgeId || "OIL-MGR",
        role: sessionUser.designation || "HSE Operations Manager",
      },
      reviewedAt: now,
      decision,
      notes: notes || (decision === "confirmed" ? "AI extraction verified compliant by HSE Manager." : "AI assessment corrected by HSE Manager."),
      originalAssessment: originalAssessment || {},
      correctedAssessment: decision === "corrected" ? correctedAssessment : undefined,
    };

    const updatedCard = await reviewConcernCard({
      cardId,
      review: auditRecord,
      correctedFields: decision === "corrected" ? correctedAssessment : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Safety concern ${decision === "confirmed" ? "confirmed" : "corrected and updated"} successfully.`,
      card: updatedCard,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record human review";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
