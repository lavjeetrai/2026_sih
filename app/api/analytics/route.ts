import { NextResponse } from "next/server";
import { getBoard } from "@/lib/data/concerns";
import { mapToLifeSavingRule } from "@/lib/safety";
import { extractWarningPatterns } from "@/lib/patterns";
import { calculateSiteHsePriorityScore } from "@/lib/prioritization";
import type { CardData, WarningPatternRecord } from "@/types";

export const dynamic = "force-dynamic";

export interface SiteDensityItem {
  label: string;
  value: number; // SIF density average (0 - 100)
  incidentCount: number;
  criticalCount: number;
  color: string;
}

export interface LsrDistributionItem {
  label: string;
  value: number; // percentage (0 - 100)
  count: number;
  color: string;
}

export interface SeverityTierItem {
  tier: string;
  label: string;
  count: number;
  heightPercent: number;
  bgGradient: string;
  stripeColor: string;
}

export interface AssetCategoryItem {
  id: string;
  label: string;
  percentage: number;
  count: number;
  color: string;
  accentColor: string;
  description: string;
}

export interface PriorityFactors {
  criticalPrecursorCount: number;
  highPriorityPatternCount: number;
  moderatePrecursorCount: number;
  averageSifScore: number;
  totalReports: number;
  factorExplanation: string;
}

export interface OperationalSiteItem {
  id: string;
  name: string;
  basin: string;
  sensors?: number;
  status: "Normal" | "Watch" | "Critical";
  incidentCount: number;
  badge?: string;
  coordinates: { x: number; y: number };
  hsePriorityScore?: number;
  priorityLevel?: "CRITICAL" | "HIGH" | "ELEVATED" | "ROUTINE";
  priorityFactors?: PriorityFactors;
}

export interface TrendPointItem {
  date: string;
  current: number;
  previous: number;
  label: string;
}

/**
 * Parses millisecond timestamp from card for authentic timeframe filtering.
 */
function getCardEpoch(card: CardData): number {
  if (card.id && card.id.startsWith("worker-concern-")) {
    const epoch = parseInt(card.id.replace("worker-concern-", ""), 10);
    if (!isNaN(epoch) && epoch > 0) return epoch;
  }
  if (card.createdAt) {
    const p = new Date(card.createdAt).getTime();
    if (!isNaN(p) && p > 0) return p;
  }
  if (card.reportedAt) {
    const clean = card.reportedAt.replace(/•/g, " ").replace(/IST/g, "").trim();
    const p = Date.parse(clean);
    if (!isNaN(p) && p > 0) return p;
  }
  if (card.date) {
    const p = Date.parse(`${card.date}, 2026`);
    if (!isNaN(p) && p > 0) return p;
  }
  return 0;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get("timeframe") || "week").toLowerCase();

    // 1. Query real board data from MongoDB Atlas / local concerns store
    const board = await getBoard();
    const allCards: CardData[] = [];
    let todoCount = 0;
    let inProgressCount = 0;
    let doneCount = 0;

    for (const col of board) {
      for (const card of col.cards) {
        if (!card.id.match(/^c-[1-4]$/)) {
          allCards.push(card);
          if (card.status === "Done" || col.title.toLowerCase().includes("done")) {
            doneCount++;
          } else if (card.status === "In Progress" || col.title.toLowerCase().includes("progress")) {
            inProgressCount++;
          } else {
            todoCount++;
          }
        }
      }
    }

    const now = new Date();
    const nowEpoch = now.getTime();
    const todayStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Timeframe filtering
    let timeframeLabel = "Current Operational Week (Trailing 7 Days)";
    let cutoffMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (timeframe === "day") {
      timeframeLabel = `Today's Active Shift • ${todayStr}, 2026`;
      cutoffMs = 24 * 60 * 60 * 1000;
    } else if (timeframe === "week") {
      timeframeLabel = "Weekly HSE Trailing Period (Last 7 Days)";
      cutoffMs = 7 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "month") {
      timeframeLabel = `Monthly HSE Cumulative Review (${now.toLocaleDateString("en-US", { month: "long" })} 2026)`;
      cutoffMs = 30 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "year") {
      timeframeLabel = `Annual Cumulative HSE Audit (${now.getFullYear()} YTD)`;
      cutoffMs = 365 * 24 * 60 * 60 * 1000;
    }

    // Filter cards for selected timeframe
    const cardsToProcess = allCards.filter((card) => {
      const cardEpoch = getCardEpoch(card);
      if (cardEpoch === 0) return true;
      return nowEpoch - cardEpoch <= cutoffMs;
    });

    // ─── 2. SIF SEVERITY TIERS (Striped Bar Chart real data) ───────────────
    let countNearMiss = 0;       // <25
    let countUnsafeCond = 0;     // 25-50
    let countUnsafeAct = 0;      // 50-70
    let countCriticalSif = 0;    // >70

    for (const card of allCards) {
      const score = card.sif_score ?? (card.priority === "High" ? 85 : card.priority === "Medium" ? 50 : 20);
      if (score >= 70) countCriticalSif++;
      else if (score >= 50) countUnsafeAct++;
      else if (score >= 25) countUnsafeCond++;
      else countNearMiss++;
    }

    const maxTierCount = Math.max(countNearMiss, countUnsafeCond, countUnsafeAct, countCriticalSif, 1);

    const severityTiers: SeverityTierItem[] = [
      {
        tier: "<25",
        label: "Near Miss",
        count: countNearMiss,
        heightPercent: Math.max(18, Math.round((countNearMiss / maxTierCount) * 100)),
        bgGradient: "from-rose-300 to-rose-400",
        stripeColor: "rgba(255, 255, 255, 0.35)",
      },
      {
        tier: "25-50",
        label: "Unsafe Condition",
        count: countUnsafeCond,
        heightPercent: Math.max(18, Math.round((countUnsafeCond / maxTierCount) * 100)),
        bgGradient: "from-blue-500 to-indigo-600",
        stripeColor: "rgba(255, 255, 255, 0.35)",
      },
      {
        tier: "50-70",
        label: "Unsafe Action",
        count: countUnsafeAct,
        heightPercent: Math.max(18, Math.round((countUnsafeAct / maxTierCount) * 100)),
        bgGradient: "from-emerald-700 to-teal-800",
        stripeColor: "rgba(255, 255, 255, 0.35)",
      },
      {
        tier: ">70",
        label: "Critical SIF",
        count: countCriticalSif,
        heightPercent: Math.max(18, Math.round((countCriticalSif / maxTierCount) * 100)),
        bgGradient: "from-red-500 to-rose-600",
        stripeColor: "rgba(255, 255, 255, 0.35)",
      },
    ];

    // ─── 3. ASSET CATEGORY BREAKDOWN (Overlapping Bubble Chart real data) ───
    let rigCount = 0;
    let stationCount = 0;
    let pipelineCount = 0;

    for (const card of allCards) {
      const text = `${card.hazard || ""} ${card.title || ""} ${card.failed_barrier || ""} ${card.observation || ""} ${card.reporter?.station || ""}`.toLowerCase();
      if (text.includes("rig") || text.includes("derrick") || text.includes("winch") || text.includes("lifting") || text.includes("bop") || text.includes("drill")) {
        rigCount++;
      } else if (text.includes("gas") || text.includes("station") || text.includes("ggs") || text.includes("ocs") || text.includes("confined") || text.includes("toxic") || text.includes("vapor")) {
        stationCount++;
      } else {
        pipelineCount++;
      }
    }

    const totalAssets = rigCount + stationCount + pipelineCount;
    const rigPct = totalAssets > 0 ? Math.round((rigCount / totalAssets) * 100) : 0;
    const stationPct = totalAssets > 0 ? Math.round((stationCount / totalAssets) * 100) : 0;
    const pipelinePct = totalAssets > 0 ? Math.max(0, 100 - rigPct - stationPct) : 0;

    const assetCategories: AssetCategoryItem[] = [
      {
        id: "drilling",
        label: "Drilling Rigs",
        percentage: rigPct,
        count: rigCount,
        color: "#4C6EF5",
        accentColor: "#3B5BDB",
        description: "Moran Rig-04 & Rig Operations",
      },
      {
        id: "stations",
        label: "Gathering Stations",
        percentage: stationPct,
        count: stationCount,
        color: "#0D6855",
        accentColor: "#094B3D",
        description: "Naharkatiya OCS-1 & Duliajan Central GGS",
      },
      {
        id: "pipelines",
        label: "Corridor Pipelines",
        percentage: pipelinePct,
        count: pipelineCount,
        color: "#FF8A7A",
        accentColor: "#E04838",
        description: "Brahmaputra Crude Pipeline Trunklines",
      },
    ];

    // ─── 4. CROSS-REPORT RECURRING WARNING PATTERNS ────────────────────────
    let warningPatterns: WarningPatternRecord[] = [];
    try {
      const patternResult = await extractWarningPatterns(allCards);
      warningPatterns = patternResult.patterns;
    } catch (err) {
      console.warn("[analytics] Warning pattern extraction warning:", err);
    }

    // ─── 5. OPERATIONAL SITES TELEMETRY & HSE PRIORITY SCORING ──────────────
    const baseSites = [
      { id: "moran", name: "Moran Rig #04 (Assam Basin)", basin: "Assam Shelf", coordinates: { x: 62, y: 38 } },
      { id: "nhkt", name: "Naharkatiya OCS-1 (Crude Gathering)", basin: "Upper Assam", coordinates: { x: 54, y: 52 } },
      { id: "duliajan", name: "Duliajan Central GGS (Gas Processing)", basin: "HQ Sector", coordinates: { x: 70, y: 48 } },
      { id: "digboi", name: "Digboi Field Station (Historic Complex)", basin: "Digboi Thrust", coordinates: { x: 80, y: 32 } },
      { id: "pipeline4b", name: "Pipeline Corridor 4B (River Crossing)", basin: "Brahmaputra", coordinates: { x: 42, y: 64 } },
      { id: "kumchai", name: "Kumchai Gas Field (Arunachal Foothills)", basin: "Fold Belt", coordinates: { x: 88, y: 22 } },
    ];

    const operationalSites: OperationalSiteItem[] = baseSites.map((site) => {
      const siteCards = allCards.filter((card) => {
        const text = `${card.reporter?.station || ""} ${card.title || ""} ${card.observation || ""}`.toLowerCase();
        if (site.id === "moran" && text.includes("moran")) return true;
        if (site.id === "nhkt" && text.includes("naharkatiya")) return true;
        if (site.id === "duliajan" && text.includes("duliajan")) return true;
        if (site.id === "digboi" && text.includes("digboi")) return true;
        if (site.id === "pipeline4b" && text.includes("pipeline")) return true;
        if (site.id === "kumchai" && text.includes("kumchai")) return true;
        return false;
      });

      const criticalPrecursorCount = siteCards.filter((c) => (c.sif_score ?? 0) >= 70).length;
      const moderatePrecursorCount = siteCards.filter((c) => (c.sif_score ?? 0) >= 40 && (c.sif_score ?? 0) < 70).length;

      // Match high priority patterns involving this installation
      const sitePatternMatches = warningPatterns.filter((p) => {
        return (p.locations || []).some((loc) => {
          const l = loc.toLowerCase();
          return l.includes(site.id) || l.includes(site.name.toLowerCase().split(" ")[0]);
        });
      });
      const highPriorityPatternCount = sitePatternMatches.filter((p) => p.hsePriority === "HIGH").length;

      const avgSifScore = siteCards.length > 0
        ? Math.round(siteCards.reduce((acc, c) => acc + (c.sif_score ?? 0), 0) / siteCards.length)
        : 0;

      const { hsePriorityScore, priorityLevel, status } = calculateSiteHsePriorityScore({
        criticalPrecursorCount,
        moderatePrecursorCount,
        highPriorityPatternCount,
        avgSifScore,
        totalSiteReports: siteCards.length,
      });

      const factorParts: string[] = [];
      if (criticalPrecursorCount > 0) factorParts.push(`${criticalPrecursorCount} Critical Precursor(s) [Score ≥ 70]`);
      if (highPriorityPatternCount > 0) factorParts.push(`${highPriorityPatternCount} High-Priority Warning Pattern(s)`);
      if (moderatePrecursorCount > 0) factorParts.push(`${moderatePrecursorCount} Moderate Precursor(s)`);
      if (avgSifScore >= 65) factorParts.push(`Elevated Site Avg SIF (${avgSifScore}/100)`);
      if (siteCards.length > 0) factorParts.push(`${siteCards.length} Total Report(s) Analyzed`);

      const factorExplanation = factorParts.length > 0
        ? `HSE Intervention Priority: ${factorParts.join("; ")}. (Ranked by precursor intervention priority, not event probability).`
        : "Routine monitoring: no precursor anomalies or recurring patterns detected.";

      return {
        ...site,
        status,
        incidentCount: siteCards.length,
        hsePriorityScore,
        priorityLevel,
        priorityFactors: {
          criticalPrecursorCount,
          highPriorityPatternCount,
          moderatePrecursorCount,
          averageSifScore: avgSifScore,
          totalReports: siteCards.length,
          factorExplanation,
        },
      };
    });

    // ─── 5. TREND TIMELINE (Actual stored records aggregation) ──────────────
    const trendTimeline: TrendPointItem[] = [];

    if (timeframe === "day") {
      const hours = [
        { date: "00:00", label: "Night Shift A", hour: 0 },
        { date: "04:00", label: "Dawn Inspection", hour: 4 },
        { date: "08:00", label: "Morning Drill", hour: 8 },
        { date: "12:00", label: "Midday Triage", hour: 12 },
        { date: "16:00", label: "Afternoon Handover", hour: 16 },
        { date: "20:00", label: "Evening Watch", hour: 20 },
        { date: "23:59", label: "Night Shift B", hour: 23 },
      ];

      for (const h of hours) {
        const cardMatch = allCards.filter((c) => {
          const ep = getCardEpoch(c);
          if (ep === 0) return false;
          const d = new Date(ep);
          return Math.abs(d.getHours() - h.hour) <= 2;
        }).length;

        trendTimeline.push({
          date: h.date,
          label: h.label,
          current: cardMatch,
          previous: 0,
        });
      }
    } else if (timeframe === "month") {
      const weeks = [
        { date: "Week 1", label: "Barrier Audits", minDay: 1, maxDay: 7 },
        { date: "Week 2", label: "Rig Floor Inspections", minDay: 8, maxDay: 14 },
        { date: "Week 3", label: "SIF Precursor Reviews", minDay: 15, maxDay: 21 },
        { date: "Week 4", label: "LSR Verification Cycle", minDay: 22, maxDay: 31 },
      ];

      for (const w of weeks) {
        const count = allCards.filter((c) => {
          const ep = getCardEpoch(c);
          if (ep === 0) return false;
          const d = new Date(ep);
          return d.getDate() >= w.minDay && d.getDate() <= w.maxDay;
        }).length;

        trendTimeline.push({
          date: w.date,
          label: w.label,
          current: count,
          previous: 0,
        });
      }
    } else if (timeframe === "year") {
      const quarters = [
        { date: "Q1", label: "Q1 Mandate", months: [0, 1, 2] },
        { date: "Q2", label: "Q2 Monsoon Prep", months: [3, 4, 5] },
        { date: "Q3", label: "Q3 Integrity Cycle", months: [6, 7, 8] },
        { date: "Q4", label: "Q4 HSE Review", months: [9, 10, 11] },
      ];

      for (const q of quarters) {
        const count = allCards.filter((c) => {
          const ep = getCardEpoch(c);
          if (ep === 0) return false;
          const d = new Date(ep);
          return q.months.includes(d.getMonth());
        }).length;

        trendTimeline.push({
          date: q.date,
          label: q.label,
          current: count,
          previous: 0,
        });
      }
    } else {
      // Weekly trailing 7 days
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(nowEpoch - i * 24 * 60 * 60 * 1000);
        const dayName = days[d.getDay() === 0 ? 6 : d.getDay() - 1];
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        // Real cards matching this day
        const dayCards = allCards.filter((c) => {
          const ep = getCardEpoch(c);
          if (ep === 0) return false;
          const cardDate = new Date(ep);
          return (
            cardDate.getDate() === d.getDate() &&
            cardDate.getMonth() === d.getMonth() &&
            cardDate.getFullYear() === d.getFullYear()
          );
        });

        const currentCount = dayCards.length;
        trendTimeline.push({
          date: dateStr,
          label: `${dayName} HSE Log`,
          current: currentCount,
          previous: 0,
        });
      }
    }

    // ─── 6. REAL EXECUTIVE KPIS & HSE PRIORITY RANKING ─────────────────────
    const totalReports = allCards.length;
    const criticalPrecursors = allCards.filter((c) => (c.sif_score ?? 0) >= 70).length;
    const avgSifScore =
      allCards.length > 0
        ? Math.round(allCards.reduce((acc, c) => acc + (c.sif_score ?? 0), 0) / allCards.length)
        : 0;

    // Highest Priority Site ranked by HSE Priority Score (precursor severity over volume)
    const sitesByPriority = [...operationalSites].sort((a, b) => (b.hsePriorityScore ?? 0) - (a.hsePriorityScore ?? 0));
    const highestPrioritySiteObj = sitesByPriority[0];
    const hasPriorityData = highestPrioritySiteObj && (highestPrioritySiteObj.hsePriorityScore ?? 0) > 0;

    const highestPrioritySite = hasPriorityData
      ? {
          name: highestPrioritySiteObj.name,
          displayName: highestPrioritySiteObj.name.split("(")[0].trim(),
          hsePriorityScore: highestPrioritySiteObj.hsePriorityScore ?? 0,
          priorityLevel: highestPrioritySiteObj.priorityLevel ?? "ROUTINE",
          rationale: highestPrioritySiteObj.priorityFactors?.factorExplanation || "",
          factors: {
            criticalPrecursors: highestPrioritySiteObj.priorityFactors?.criticalPrecursorCount ?? 0,
            highPriorityPatterns: highestPrioritySiteObj.priorityFactors?.highPriorityPatternCount ?? 0,
            moderatePrecursors: highestPrioritySiteObj.priorityFactors?.moderatePrecursorCount ?? 0,
            avgSifScore: highestPrioritySiteObj.priorityFactors?.averageSifScore ?? 0,
            totalReports: highestPrioritySiteObj.incidentCount ?? 0,
          },
          explanation: `${highestPrioritySiteObj.priorityFactors?.criticalPrecursorCount ?? 0} critical precursor(s), ${highestPrioritySiteObj.priorityFactors?.highPriorityPatternCount ?? 0} pattern(s)`,
        }
      : {
          name: totalReports === 0 ? "Insufficient data" : "None flagged",
          displayName: totalReports === 0 ? "No data" : "None flagged",
          hsePriorityScore: 0,
          priorityLevel: "ROUTINE" as const,
          rationale: "No critical precursors or recurring warning patterns detected across installations.",
          factors: {
            criticalPrecursors: 0,
            highPriorityPatterns: 0,
            moderatePrecursors: 0,
            avgSifScore: 0,
            totalReports: 0,
          },
          explanation: "All monitored sites within baseline tolerances",
        };

    const highestRiskSite = highestPrioritySite.displayName;
    const hasSufficientData = totalReports > 0;

    const highPriorityCount = warningPatterns.filter((p) => p.hsePriority === "HIGH").length;
    const mediumPriorityCount = warningPatterns.filter((p) => p.hsePriority === "MEDIUM").length;
    const lowPriorityCount = warningPatterns.filter((p) => p.hsePriority === "LOW").length;
    const crossSiteCount = warningPatterns.filter((p) => p.patternScope === "CROSS_SITE").length;

    return NextResponse.json({
      success: true,
      timeframe,
      timeframeLabel,
      hasSufficientData,
      kpis: {
        totalReports,
        criticalPrecursors,
        avgSifScore,
        highestRiskSite,
        highestPrioritySite,
        todoCount,
        inProgressCount,
        doneCount,
      },
      severityTiers,
      assetCategories,
      operationalSites,
      trendTimeline,
      warningPatterns,
      patternSummary: {
        totalDetected: warningPatterns.length,
        highPriority: highPriorityCount,
        mediumPriority: mediumPriorityCount,
        lowPriority: lowPriorityCount,
        crossSite: crossSiteCount,
        hasPatterns: warningPatterns.length > 0,
      },
      dataSource: "OIL India HSE Registry & MongoDB Atlas",
      recordCount: allCards.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Analytics error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
