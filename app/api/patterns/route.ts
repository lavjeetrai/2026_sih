import { NextResponse } from "next/server";
import { extractWarningPatterns } from "@/lib/patterns";
import { getSessionUser } from "@/lib/auth";
import type { WarningPatternRecord } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/patterns
 * 
 * Secure endpoint to query cross-report warning patterns.
 * Protected with server-side authentication and role-based authorization.
 * 
 * Query Filters:
 * - location: Filter by specific installation/site (e.g. Moran, Naharkatiya)
 * - activity: Filter by operational activity (e.g. maintenance, drilling)
 * - lifeSavingRule: Filter by IOGP Life-Saving Rule (e.g. Energy Isolation)
 * - trend: Filter by temporal trend (NEW, INCREASING, STABLE, DECREASING)
 * - priority: Filter by HSE priority (HIGH, MEDIUM, LOW)
 * - minReports: Override minimum reports threshold (integer, min 2)
 * - windowDays: Override rolling analysis window in days (integer)
 */
export async function GET(req: Request) {
  try {
    // 1. Server-side Authentication & Authorization Check
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required to access Cross-Report Warning Patterns.",
        },
        { status: 401 }
      );
    }

    // Both manager and worker can view safety patterns, but verify user is approved
    if (sessionUser.status !== "approved") {
      return NextResponse.json(
        {
          success: false,
          error: "Account approval required to access safety intelligence.",
        },
        { status: 403 }
      );
    }

    // 2. Parse Query Parameters & Filters
    const { searchParams } = new URL(req.url);
    const filterLocation = searchParams.get("location")?.toLowerCase().trim();
    const filterActivity = searchParams.get("activity")?.toLowerCase().trim();
    const filterLsr = searchParams.get("lifeSavingRule")?.toLowerCase().trim();
    const filterTrend = searchParams.get("trend")?.toUpperCase().trim();
    const filterPriority = searchParams.get("priority")?.toUpperCase().trim();

    const minReportsParam = searchParams.get("minReports");
    const windowDaysParam = searchParams.get("windowDays");

    const customConfig: Record<string, number> = {};
    if (minReportsParam) {
      const parsed = parseInt(minReportsParam, 10);
      if (!isNaN(parsed) && parsed >= 2) customConfig.minReports = parsed;
    }
    if (windowDaysParam) {
      const parsed = parseInt(windowDaysParam, 10);
      if (!isNaN(parsed) && parsed > 0) customConfig.analysisWindowDays = parsed;
    }

    // 3. Extract Warning Patterns
    const result = await extractWarningPatterns(undefined, customConfig);

    // 4. Apply Optional Filters
    let filteredPatterns = result.patterns;

    if (filterLocation) {
      filteredPatterns = filteredPatterns.filter((p) =>
        p.locations.some((loc) => loc.toLowerCase().includes(filterLocation))
      );
    }

    if (filterActivity) {
      filteredPatterns = filteredPatterns.filter((p) =>
        p.activities.some((act) => act.toLowerCase().includes(filterActivity))
      );
    }

    if (filterLsr) {
      filteredPatterns = filteredPatterns.filter((p) =>
        p.lifeSavingRules.some((lsr) => lsr.toLowerCase().includes(filterLsr))
      );
    }

    if (filterTrend) {
      filteredPatterns = filteredPatterns.filter((p) => p.trend === filterTrend);
    }

    if (filterPriority) {
      filteredPatterns = filteredPatterns.filter((p) => p.hsePriority === filterPriority);
    }

    return NextResponse.json({
      success: true,
      patterns: filteredPatterns,
      totalDetected: result.patterns.length,
      filteredCount: filteredPatterns.length,
      totalReportsAnalyzed: result.totalAnalyzed,
      validNonDuplicateCount: result.validNonDuplicateCount,
      extractedAt: result.extractedAt,
      filtersApplied: {
        location: filterLocation || null,
        activity: filterActivity || null,
        lifeSavingRule: filterLsr || null,
        trend: filterTrend || null,
        priority: filterPriority || null,
      },
      disclaimer:
        "DECISION SUPPORT ONLY. Surfaces recurring safety warning precursors requiring HSE attention. Does not predict accidents, guarantee outcomes, or calculate harm probability.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal pattern extraction error";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
