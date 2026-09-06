import { NextResponse } from "next/server";
import { getBoard, CardData } from "@/lib/concerns";
import { mapToLifeSavingRule } from "@/lib/lsr";

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

export interface SeverityDonutItem {
  label: string;
  value: number; // percentage (0 - 100)
  count: number;
  color: string;
}

/**
 * Parses millisecond timestamp from card for authentic timeframe filtering.
 */
function getCardEpoch(card: CardData): number {
  if (card.id && card.id.startsWith("worker-concern-")) {
    const epoch = parseInt(card.id.replace("worker-concern-", ""), 10);
    if (!isNaN(epoch) && epoch > 0) return epoch;
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

    // Query real board data from MongoDB Atlas
    const board = await getBoard();
    const allCards: CardData[] = [];
    for (const col of board) {
      for (const card of col.cards) {
        // Double guarantee: skip any synthetic legacy IDs
        if (!card.id.match(/^c-[1-4]$/)) {
          allCards.push(card);
        }
      }
    }

    const now = new Date();
    const nowEpoch = now.getTime();
    const todayStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Timeframe filtering based strictly on real card logging dates
    let timeframeLabel = "Current Operational Week (Trailing 7 Days)";
    let cutoffMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (timeframe === "day") {
      timeframeLabel = `Today's Active Shift • ${todayStr}, 2026`;
      cutoffMs = 24 * 60 * 60 * 1000; // 24 hours
    } else if (timeframe === "week") {
      timeframeLabel = "Weekly HSE Trailing Period (Last 7 Days)";
      cutoffMs = 7 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "month") {
      timeframeLabel = `Monthly HSE Cumulative Review (${now.toLocaleDateString("en-US", { month: "long" })} 2026)`;
      cutoffMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else if (timeframe === "year") {
      timeframeLabel = `Annual Cumulative HSE Audit (${now.getFullYear()} YTD)`;
      cutoffMs = 365 * 24 * 60 * 60 * 1000; // 1 year
    }

    // Filter real cards strictly according to the selected timeframe
    const cardsToProcess = allCards.filter((card) => {
      const cardEpoch = getCardEpoch(card);
      if (cardEpoch === 0) return true; // Include if indeterminate
      return nowEpoch - cardEpoch <= cutoffMs;
    });

    // 1. Site SIF Density Calculation from Real Data
    const siteMap = new Map<string, { totalSif: number; count: number; criticalCount: number }>();
    const defaultSites = [
      "MORAN RIG-4",
      "NAHARKATIYA",
      "DULIAJAN GGS",
      "DIGBOI STN",
      "PIPELINE 4B",
    ];

    for (const s of defaultSites) {
      siteMap.set(s, { totalSif: 0, count: 0, criticalCount: 0 });
    }

    for (const card of cardsToProcess) {
      const stationRaw = card.reporter?.station || card.title || "MORAN RIG-4";
      let matchedSite = "MORAN RIG-4";

      const upper = stationRaw.toUpperCase();
      if (upper.includes("NAHARKATIYA") || upper.includes("NHKT")) matchedSite = "NAHARKATIYA";
      else if (upper.includes("DULIAJAN") || upper.includes("GGS")) matchedSite = "DULIAJAN GGS";
      else if (upper.includes("DIGBOI")) matchedSite = "DIGBOI STN";
      else if (upper.includes("PIPELINE")) matchedSite = "PIPELINE 4B";
      else if (upper.includes("MORAN") || upper.includes("RIG")) matchedSite = "MORAN RIG-4";

      const current = siteMap.get(matchedSite) || { totalSif: 0, count: 0, criticalCount: 0 };
      const sif = card.sif_score ?? (card.priority === "High" ? 85 : card.priority === "Medium" ? 50 : 25);

      current.totalSif += sif;
      current.count += 1;
      if (sif >= 70) current.criticalCount += 1;
      siteMap.set(matchedSite, current);
    }

    const colorPalette = ["bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-400", "bg-purple-400"];
    const siteSifDensity: SiteDensityItem[] = Array.from(siteMap.entries())
      .map(([label, stats], idx) => {
        const densityScore = stats.count > 0 ? Math.round(stats.totalSif / stats.count) : 0;
        return {
          label,
          value: densityScore,
          incidentCount: stats.count,
          criticalCount: stats.criticalCount,
          color: colorPalette[idx % colorPalette.length],
        };
      })
      .sort((a, b) => b.incidentCount - a.incidentCount || b.value - a.value);

    // 2. Life-Saving Rules (LSR) Distribution from Real Data
    const lsrCounts: Record<string, { count: number; color: string }> = {
      "WORK AT HEIGHT": { count: 0, color: "#ef4444" },
      "SAFE LIFTING": { count: 0, color: "#f97316" },
      "ENERGY ISOLATION": { count: 0, color: "#facc15" },
      "TOXIC GAS": { count: 0, color: "#06b6d4" },
      "LINE OF FIRE": { count: 0, color: "#ec4899" },
    };

    for (const card of cardsToProcess) {
      const rule = mapToLifeSavingRule(card.hazard, card.failed_barrier, card.observation || card.description);
      const name = rule.name.toUpperCase();
      if (name.includes("HEIGHT")) lsrCounts["WORK AT HEIGHT"].count += 1;
      else if (name.includes("LIFTING")) lsrCounts["SAFE LIFTING"].count += 1;
      else if (name.includes("ISOLATION") || name.includes("CONTROL")) lsrCounts["ENERGY ISOLATION"].count += 1;
      else if (name.includes("GAS")) lsrCounts["TOXIC GAS"].count += 1;
      else lsrCounts["LINE OF FIRE"].count += 1;
    }

    const totalLsrReports = Object.values(lsrCounts).reduce((sum, item) => sum + item.count, 0);
    const lsrDistribution: LsrDistributionItem[] = Object.entries(lsrCounts).map(([label, info]) => {
      const pct = totalLsrReports > 0 ? Math.round((info.count / totalLsrReports) * 100) : 0;
      return {
        label,
        value: pct,
        count: info.count,
        color: info.color,
      };
    });

    // 3. Severity Distribution from Real Data
    let sifPrecursorCount = 0;
    let unsafeActsCount = 0;
    let unsafeConditionsCount = 0;
    let nearMissCount = 0;

    for (const card of cardsToProcess) {
      const score = card.sif_score ?? 50;
      if (score >= 70) sifPrecursorCount += 1;
      else if (score >= 45) unsafeActsCount += 1;
      else if (score >= 25) unsafeConditionsCount += 1;
      else nearMissCount += 1;
    }

    const totalSev = sifPrecursorCount + unsafeActsCount + unsafeConditionsCount + nearMissCount;
    const severityDonut: SeverityDonutItem[] = [
      {
        label: "SIF-P",
        count: sifPrecursorCount,
        value: totalSev > 0 ? Math.round((sifPrecursorCount / totalSev) * 100) : 0,
        color: "#f87171",
      },
      {
        label: "Unsafe Acts",
        count: unsafeActsCount,
        value: totalSev > 0 ? Math.round((unsafeActsCount / totalSev) * 100) : 0,
        color: "#4ade80",
      },
      {
        label: "Unsafe Conditions",
        count: unsafeConditionsCount,
        value: totalSev > 0 ? Math.round((unsafeConditionsCount / totalSev) * 100) : 0,
        color: "#60a5fa",
      },
      {
        label: "Near Misses",
        count: nearMissCount,
        value: totalSev > 0 ? Math.round((nearMissCount / totalSev) * 100) : 0,
        color: "#fbbf24",
      },
    ];

    // 4. Executive KPIs strictly from Real Data
    const totalReports = cardsToProcess.length;
    const criticalPrecursors = cardsToProcess.filter((c) => (c.sif_score ?? 0) >= 70).length;
    const avgSifScore =
      cardsToProcess.length > 0
        ? Math.round(cardsToProcess.reduce((acc, c) => acc + (c.sif_score ?? 0), 0) / cardsToProcess.length)
        : 0;

    const highestRiskSite =
      cardsToProcess.length > 0 && siteSifDensity[0]?.incidentCount > 0
        ? siteSifDensity[0].label
        : "Operational (All Clear)";

    return NextResponse.json({
      success: true,
      timeframe,
      timeframeLabel,
      siteSifDensity,
      lsrDistribution,
      severityDonut,
      kpis: {
        totalReports,
        criticalPrecursors,
        avgSifScore,
        highestRiskSite,
      },
      dataSource: "MongoDB Atlas (Production)",
      databaseName: "datasih",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Analytics error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
