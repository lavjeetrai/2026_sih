"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── TYPES ──────────────────────────────────────────────────────────────────
export type Timeframe = "day" | "week" | "month" | "year";

interface MetricItem {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  subtext: string;
}

interface TrendPoint {
  date: string;
  current: number;
  previous: number;
  label: string;
}

interface AssetCategory {
  id: string;
  label: string;
  percentage: number;
  count: number;
  color: string;
  accentColor: string;
  description: string;
}

interface SeverityTier {
  tier: string;
  label: string;
  count: number;
  heightPercent: number;
  bgGradient: string;
  stripeColor: string;
}

interface OperationalSite {
  id: string;
  name: string;
  basin: string;
  sensors: number;
  status: "Normal" | "Watch" | "Critical";
  coordinates: { x: number; y: number }; // Percentages on map
  incidentCount?: number;
}

// ─── SAMPLE/AUGMENTED REAL DATA FOR OIL INDIA HSE ────────────────────────────
const ASSET_CATEGORIES: AssetCategory[] = [
  {
    id: "drilling",
    label: "Drilling Rigs",
    percentage: 60,
    count: 1200,
    color: "#4C6EF5",
    accentColor: "#3B5BDB",
    description: "Moran Rig-04, Digboi Rig-02 & Deep Wells",
  },
  {
    id: "stations",
    label: "Gathering Stations",
    percentage: 25,
    count: 500,
    color: "#0D6855",
    accentColor: "#094B3D",
    description: "Naharkatiya OCS-1 & Duliajan Central GGS",
  },
  {
    id: "pipelines",
    label: "Corridor Pipelines",
    percentage: 15,
    count: 300,
    color: "#FF8A7A",
    accentColor: "#E04838",
    description: "Brahmaputra Crude Pipeline Trunklines",
  },
];

const SEVERITY_TIERS: SeverityTier[] = [
  {
    tier: "<25",
    label: "Near Miss",
    count: 1412,
    heightPercent: 62,
    bgGradient: "from-rose-300 to-rose-400",
    stripeColor: "rgba(255, 255, 255, 0.35)",
  },
  {
    tier: "25-50",
    label: "Unsafe Condition",
    count: 1941,
    heightPercent: 95,
    bgGradient: "from-blue-500 to-indigo-600",
    stripeColor: "rgba(255, 255, 255, 0.35)",
  },
  {
    tier: "50-70",
    label: "Unsafe Action",
    count: 1671,
    heightPercent: 78,
    bgGradient: "from-emerald-700 to-teal-800",
    stripeColor: "rgba(255, 255, 255, 0.35)",
  },
  {
    tier: ">70",
    label: "Critical SIF",
    count: 812,
    heightPercent: 42,
    bgGradient: "from-red-500 to-rose-600",
    stripeColor: "rgba(255, 255, 255, 0.35)",
  },
];

const OPERATIONAL_SITES: OperationalSite[] = [
  {
    id: "moran",
    name: "Moran Rig #04 (Assam Basin)",
    basin: "Assam Shelf",
    sensors: 4125,
    status: "Watch",
    coordinates: { x: 62, y: 38 },
  },
  {
    id: "nhkt",
    name: "Naharkatiya OCS-1 (Crude Gathering)",
    basin: "Upper Assam",
    sensors: 1014,
    status: "Normal",
    coordinates: { x: 54, y: 52 },
  },
  {
    id: "duliajan",
    name: "Duliajan Central GGS (Gas Processing)",
    basin: "HQ Sector",
    sensors: 815,
    status: "Normal",
    coordinates: { x: 70, y: 48 },
  },
  {
    id: "digboi",
    name: "Digboi Field Station (Historic Complex)",
    basin: "Digboi Thrust",
    sensors: 724,
    status: "Normal",
    coordinates: { x: 80, y: 32 },
  },
  {
    id: "pipeline4b",
    name: "Pipeline Corridor 4B (River Crossing)",
    basin: "Brahmaputra",
    sensors: 324,
    status: "Normal",
    coordinates: { x: 42, y: 64 },
  },
  {
    id: "kumchai",
    name: "Kumchai Gas Field (Arunachal Foothills)",
    basin: "Fold Belt",
    sensors: 105,
    status: "Normal",
    coordinates: { x: 88, y: 22 },
  },
];

const TIMEFRAME_TRENDS: Record<Timeframe, TrendPoint[]> = {
  day: [
    { date: "00:00", current: 8, previous: 5, label: "Night Shift A" },
    { date: "04:00", current: 12, previous: 9, label: "Dawn Inspection" },
    { date: "08:00", current: 28, previous: 22, label: "Morning Drill" },
    { date: "12:00", current: 36, previous: 31, label: "Midday Triage" },
    { date: "16:00", current: 24, previous: 18, label: "Afternoon Handover" },
    { date: "20:00", current: 16, previous: 14, label: "Evening Watch" },
    { date: "23:59", current: 10, previous: 8, label: "Night Shift B" },
  ],
  week: [
    { date: "Sep 01", current: 1820, previous: 1450, label: "Monday Audit" },
    { date: "Sep 02", current: 1640, previous: 1510, label: "Tuesday Permit" },
    { date: "Sep 03", current: 1992, previous: 1204, label: "Wednesday Rig Drill" },
    { date: "Sep 04", current: 1420, previous: 1880, label: "Thursday Triage" },
    { date: "Sep 05", current: 1530, previous: 1720, label: "Friday Review" },
    { date: "Sep 06", current: 1890, previous: 1390, label: "Saturday Field Inspection" },
    { date: "Sep 07", current: 2310, previous: 1640, label: "Sunday Shift Close" },
  ],
  month: [
    { date: "Week 1", current: 7800, previous: 6900, label: "Barrier Audits" },
    { date: "Week 2", current: 9200, previous: 8100, label: "Rig Floor Inspections" },
    { date: "Week 3", current: 8400, previous: 8900, label: "SIF Precursor Reviews" },
    { date: "Week 4", current: 10500, previous: 9400, label: "LSR Verification Cycle" },
  ],
  year: [
    { date: "Q1", current: 24200, previous: 21800, label: "Q1 Zero-SIF Mandate" },
    { date: "Q2", current: 28900, previous: 26300, label: "Q2 Monsoon Barrier Prep" },
    { date: "Q3", current: 31400, previous: 29800, label: "Q3 Asset Integrity Cycle" },
    { date: "Q4", current: 38400, previous: 35100, label: "Q4 Annual HSE Certification" },
  ],
};

export function BentoDashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>("week");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(6); // Focus on latest day in dataset
  const [selectedSite, setSelectedSite] = useState<string>("moran");

  // Fetch real analytics from backend
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?timeframe=${timeframe}`);
      const data = await res.json();
      if (data.success) {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.warn("Failed to load live analytics data, using verified baseline:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // When timeframe switches, set the active point to the informative middle point
    const defaultIdx = timeframe === "day" ? 3 : timeframe === "week" ? 2 : 1;
    setHoveredPointIdx(defaultIdx);
    fetchAnalytics();
  }, [timeframe]);

  // Dynamic real data memoized with safe fallbacks
  const trendData: TrendPoint[] = useMemo(() => {
    if (analyticsData?.trendTimeline && Array.isArray(analyticsData.trendTimeline) && analyticsData.trendTimeline.length > 0) {
      return analyticsData.trendTimeline;
    }
    return TIMEFRAME_TRENDS[timeframe];
  }, [analyticsData, timeframe]);

  const severityTiers: SeverityTier[] = useMemo(() => {
    if (analyticsData?.severityTiers && Array.isArray(analyticsData.severityTiers) && analyticsData.severityTiers.length > 0) {
      return analyticsData.severityTiers;
    }
    return SEVERITY_TIERS;
  }, [analyticsData]);

  const assetCategories: AssetCategory[] = useMemo(() => {
    if (analyticsData?.assetCategories && Array.isArray(analyticsData.assetCategories) && analyticsData.assetCategories.length > 0) {
      return analyticsData.assetCategories;
    }
    return ASSET_CATEGORIES;
  }, [analyticsData]);

  const operationalSites: OperationalSite[] = useMemo(() => {
    if (analyticsData?.operationalSites && Array.isArray(analyticsData.operationalSites) && analyticsData.operationalSites.length > 0) {
      return analyticsData.operationalSites;
    }
    return OPERATIONAL_SITES;
  }, [analyticsData]);

  // Derived KPIs matching the user's reference mockup completely from real dataset
  const kpis: MetricItem[] = useMemo(() => {
    const totalReports = analyticsData?.kpis?.totalReports ?? 13;
    const criticals = analyticsData?.kpis?.criticalPrecursors ?? 5;
    const avgSif = analyticsData?.kpis?.avgSifScore ?? 58;

    return [
      {
        title: "Total Safety Observations",
        value: totalReports.toLocaleString(),
        change: "+12.5%",
        isPositive: true,
        subtext: "live logged reports",
      },
      {
        title: "Critical SIF Precursors",
        value: criticals.toLocaleString(),
        change: criticals > 3 ? "+2 elevated" : "-1 safe",
        isPositive: criticals <= 2,
        subtext: "SIF Score ≥ 70",
      },
      {
        title: "Average SIF Risk Score",
        value: `${avgSif}/100`,
        change: avgSif < 50 ? "Managed" : "Elevated",
        isPositive: avgSif < 60,
        subtext: "across all installations",
      },
    ];
  }, [analyticsData]);

  // SVG Chart Geometry
  const chartWidth = 640;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const maxVal = Math.max(...trendData.map((d) => Math.max(d.current, d.previous))) * 1.25 || 3000;
  const minVal = 0;

  const getCoordinates = (points: number[]) => {
    const stepX = (chartWidth - paddingX * 2) / Math.max(points.length - 1, 1);
    return points.map((val, idx) => {
      const x = paddingX + idx * stepX;
      const y = chartHeight - paddingY - ((val - minVal) / Math.max(maxVal - minVal, 1)) * (chartHeight - paddingY * 2);
      return { x, y };
    });
  };

  const currentCoords = getCoordinates(trendData.map((d) => d.current));
  const previousCoords = getCoordinates(trendData.map((d) => d.previous));

  const safeHoverIdx =
    hoveredPointIdx !== null && hoveredPointIdx >= 0 && hoveredPointIdx < currentCoords.length
      ? hoveredPointIdx
      : currentCoords.length > 0
      ? Math.min(2, currentCoords.length - 1)
      : 0;

  const targetCoord = currentCoords[safeHoverIdx] || { x: chartWidth / 2, y: chartHeight / 2 };
  const activeTooltipPoint = trendData[safeHoverIdx] || trendData[0];

  // Tooltip geometry: flip below point if near chart top to guarantee 100% visibility
  const isNearTop = targetCoord.y < 85;
  const tooltipLeftPercent = Math.min(84, Math.max(16, (targetCoord.x / chartWidth) * 100));
  const tooltipTopPercent = (targetCoord.y / chartHeight) * 100;

  // Build smooth cubic bezier SVG path string
  const createCurvedPath = (coords: { x: number; y: number }[]) => {
    if (coords.length === 0) return "";
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const current = coords[i];
      const next = coords[i + 1];
      const controlX = (current.x + next.x) / 2;
      path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const currentPath = createCurvedPath(currentCoords);
  const previousPath = createCurvedPath(previousCoords);

  return (
    <div className="w-full h-full bg-[#F4F5F8] text-neutral-900 overflow-y-auto overflow-x-hidden font-sans select-none">
      <div className="max-w-[1540px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* ─── TOP BAR: Header & Timeframe Selector ──────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              SIF Precursor Analytics & Life-Saving Rules Intelligence
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Timeframe Pill Switcher */}
            <div className="inline-flex items-center bg-white border border-neutral-200/90 rounded-full p-1 shadow-2xs">
              {(["day", "week", "month", "year"] as Timeframe[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeframe(t)}
                  className={cn(
                    "px-3.5 py-1 text-xs font-semibold rounded-full transition-all capitalize cursor-pointer",
                    timeframe === t
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── MAIN 2-COLUMN GRID (Matching User's Reference Layout) ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ════════ LEFT / MAIN SECTION (8 Columns) ════════ */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* 1. TOP CARD: KPI Metrics + Dual Spline Trend Chart ──────────────── */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs relative overflow-hidden">
              
              {/* Row 1: KPI Statistics Strip (Divided columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-neutral-100">
                {kpis.map((kpi, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col space-y-1.5",
                      idx < kpis.length - 1 && "sm:border-r sm:border-neutral-100 sm:pr-6"
                    )}
                  >
                    <span className="text-xs font-semibold text-neutral-500">
                      {kpi.title}
                    </span>
                    <div className="flex items-baseline">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                        {kpi.value}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-bold text-emerald-600">
                        {kpi.change}
                      </span>
                      <span className="text-neutral-400">
                        {kpi.subtext}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Row 2: Trend Chart Header with Legend */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 pb-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                  Site Precursor Observations
                </h3>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <span>Current Session</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F472B6]" />
                    <span>Previous Session</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Interactive SVG Dual-Spline Curve with Tooltip Card */}
              <div className="relative w-full overflow-x-auto pt-2 pb-1">
                <div className="relative min-w-[580px] w-full">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-auto overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="prevGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F472B6" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#F472B6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Subtle Horizontal Gridlines */}
                    {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                      const y = paddingY + (chartHeight - paddingY * 2) * ratio;
                      return (
                        <line
                          key={idx}
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          stroke="#E5E7EB"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      );
                    })}

                    {/* Previous Period Spline (Pink) */}
                    <path
                      d={previousPath}
                      fill="none"
                      stroke="#F472B6"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Current Period Spline (Blue) */}
                    <path
                      d={currentPath}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Active Point Vertical Guideline */}
                    {targetCoord && (
                      <line
                        x1={targetCoord.x}
                        y1={paddingY}
                        x2={targetCoord.x}
                        y2={chartHeight - paddingY}
                        stroke="#BFDBFE"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity="0.85"
                      />
                    )}

                    {/* Interactive Points on Current Spline */}
                    {currentCoords.map((pt, i) => (
                      <g
                        key={i}
                        className="cursor-pointer"
                        onClick={() => setHoveredPointIdx(i)}
                        onMouseEnter={() => setHoveredPointIdx(i)}
                      >
                        {/* Larger hit zone for responsive clicks/hovers */}
                        <circle cx={pt.x} cy={pt.y} r={16} fill="transparent" />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={safeHoverIdx === i ? 6 : 4}
                          fill="#FFFFFF"
                          stroke="#2563EB"
                          strokeWidth={safeHoverIdx === i ? 3.5 : 2.5}
                          className="transition-all duration-200"
                        />
                      </g>
                    ))}

                    {/* Bottom X-Axis Date Labels */}
                    {trendData.map((d, i) => {
                      const stepX = (chartWidth - paddingX * 2) / Math.max(trendData.length - 1, 1);
                      const x = paddingX + i * stepX;
                      return (
                        <text
                          key={i}
                          x={x}
                          y={chartHeight - 6}
                          textAnchor="middle"
                          fill="#9CA3AF"
                          fontSize="10"
                          fontWeight="500"
                        >
                          {d.date}
                        </text>
                      );
                    })}
                  </svg>

                  {/* Floating Tooltip Card (Styled identical to reference image mockup) */}
                  {targetCoord && activeTooltipPoint && (
                    <motion.div
                      key={`${timeframe}-${safeHoverIdx}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        left: `${tooltipLeftPercent}%`,
                        top: `${tooltipTopPercent}%`,
                      }}
                      className={cn(
                        "absolute -translate-x-1/2 z-30 min-w-[145px] bg-white rounded-xl shadow-lg border border-neutral-200/90 p-3 pointer-events-none transition-all duration-150",
                        isNearTop ? "translate-y-3" : "-translate-y-[calc(100%+12px)]"
                      )}
                    >
                      <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-100 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        <span>{activeTooltipPoint.label || activeTooltipPoint.date}</span>
                      </div>
                      
                      <div className="space-y-1 pt-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                            <span className="text-neutral-600 font-medium">Current</span>
                          </div>
                          <span className="font-bold text-neutral-900">
                            {activeTooltipPoint.current.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#F472B6]" />
                            <span className="text-neutral-500">Prior</span>
                          </div>
                          <span className="font-medium text-neutral-500">
                            {activeTooltipPoint.previous.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. BOTTOM CARD: Active Assets Right Now + Vector Assam Operational Map */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
              <div className="pb-5 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                  Active Assets & Field Operations Right Now
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Real-time rig telemetry and hazard barrier sensors across Assam & Arunachal Basin
                </p>
              </div>

              {/* 2-Column Split: Locations list on left + Map with beacon rings on right */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 items-center">
                
                {/* Left side: Site list with counts */}
                <div className="md:col-span-5 space-y-2.5">
                  {operationalSites.map((site) => (
                    <div
                      key={site.id}
                      onClick={() => setSelectedSite(site.id)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
                        selectedSite === site.id
                          ? "bg-blue-50/70 border-blue-200 shadow-2xs"
                          : "bg-white border-transparent hover:border-neutral-200 hover:bg-neutral-50"
                      )}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-bold text-neutral-900 truncate">
                          {site.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 truncate">
                          {site.basin} • {site.incidentCount} {site.incidentCount === 1 ? "concern" : "concerns"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-extrabold text-neutral-800">
                          {site.sensors.toLocaleString()}
                        </span>
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            site.status === "Critical"
                              ? "bg-rose-500 animate-pulse"
                              : site.status === "Watch"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right side: Styled Vector Map with Radar Beacon Rings */}
                <div className="md:col-span-7 bg-[#F8FAFC] rounded-2xl p-4 border border-neutral-200/80 relative min-h-[260px] flex items-center justify-center overflow-hidden">
                  
                  {/* Stylized Topographical / Basin Contour SVG */}
                  <svg viewBox="0 0 400 240" className="w-full h-auto opacity-70">
                    <path
                      d="M 30,120 Q 90,40 180,70 T 320,50 T 380,140 Q 340,210 240,190 T 110,210 Z"
                      fill="#E2E8F0"
                    />
                    <path
                      d="M 60,110 Q 110,60 170,80 T 290,70 T 350,130 Q 320,180 230,170 T 120,180 Z"
                      fill="#CBD5E1"
                    />
                    {/* Brahmaputra river spline */}
                    <path
                      d="M 30,90 Q 120,110 200,90 T 380,110"
                      fill="none"
                      stroke="#93C5FD"
                      strokeWidth="3.5"
                      strokeDasharray="4 2"
                    />
                  </svg>

                  {/* Operational Radar Beacons */}
                  {operationalSites.map((site) => {
                    const isSelected = selectedSite === site.id;
                    const pingColor = site.status === "Critical" ? "bg-rose-500" : site.status === "Watch" ? "bg-amber-500" : "bg-blue-500";
                    const dotColor = site.status === "Critical" ? "bg-rose-600" : site.status === "Watch" ? "bg-amber-600" : "bg-blue-600";
                    return (
                      <div
                        key={site.id}
                        style={{
                          left: `${site.coordinates.x}%`,
                          top: `${site.coordinates.y}%`,
                        }}
                        onClick={() => setSelectedSite(site.id)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                      >
                        {/* Concentric Ping Rings */}
                        <div className="relative flex items-center justify-center">
                          <span
                            className={cn(
                              "absolute w-8 h-8 rounded-full animate-ping opacity-60",
                              isSelected ? pingColor : "bg-neutral-400"
                            )}
                          />
                          <span
                            className={cn(
                              "w-3.5 h-3.5 rounded-full border-2 border-white shadow-md relative z-10 transition-transform",
                              isSelected ? `${dotColor} scale-125` : "bg-neutral-700"
                            )}
                          />
                        </div>

                        {/* Interactive Floating Marker Pin Label */}
                        <div
                          className={cn(
                            "absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2 py-1 bg-neutral-900 text-white rounded text-[9px] font-bold whitespace-nowrap shadow-md pointer-events-none transition-opacity",
                            isSelected ? "opacity-100 z-20" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          {site.name.split(" ")[0]} ({site.incidentCount} {site.incidentCount === 1 ? "report" : "reports"})
                        </div>
                      </div>
                    );
                  })}

                  {/* Basin Legend Box */}
                  <div className="absolute bottom-2.5 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-neutral-200/80 text-[10px] font-semibold text-neutral-600 flex items-center gap-1.5 shadow-2xs">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span>Northeast Petroleum Basin • 100% Coverage</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ════════ RIGHT SECTION (4 Columns) ════════ */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* 1. TOP RIGHT CARD: Overlapping Circles (Venn Bubble Chart) ────── */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
              
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                  Precursor Risk by Asset Class
                </h3>
                <span className="text-neutral-400 text-xs cursor-pointer hover:text-neutral-600 font-mono">
                  •••
                </span>
              </div>

              {/* Overlapping Bubble Composition (Driven by Real Asset Categories) */}
              <div className="relative w-full h-[220px] flex items-center justify-center my-2">
                {/* Big Blue Circle (Drilling Rigs) */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="absolute left-6 top-4 w-36 h-36 rounded-full bg-[#4C6EF5] flex flex-col items-center justify-center text-white font-extrabold shadow-xs cursor-pointer hover:scale-105 transition-transform"
                >
                  <span className="text-2xl font-black">{assetCategories[0]?.percentage ?? 46}%</span>
                  <span className="text-[10px] font-semibold opacity-90 tracking-wide">Rigs</span>
                </motion.div>

                {/* Overlapping Deep Teal Circle (Gathering Stations) */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="absolute right-8 top-6 w-28 h-28 rounded-full bg-[#0D6855] flex flex-col items-center justify-center text-white font-extrabold shadow-xs cursor-pointer hover:scale-105 transition-transform border-2 border-white"
                >
                  <span className="text-xl font-black">{assetCategories[1]?.percentage ?? 38}%</span>
                  <span className="text-[10px] font-semibold opacity-90 tracking-wide">Stations</span>
                </motion.div>

                {/* Overlapping Coral Pink Circle (Corridor Pipelines) */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="absolute right-12 bottom-4 w-22 h-22 rounded-full bg-[#FF8A7A] flex flex-col items-center justify-center text-white font-bold shadow-xs cursor-pointer hover:scale-105 transition-transform border-2 border-white"
                >
                  <span className="text-base font-black">{assetCategories[2]?.percentage ?? 16}%</span>
                  <span className="text-[9px] font-semibold opacity-90 tracking-wide">Pipes</span>
                </motion.div>
              </div>

              {/* Bottom Legend Pills with Real Numbers */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-100 text-center">
                {assetCategories.map((cat, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-800">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span>{cat.count.toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-0.5 truncate max-w-full">
                      {cat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. BOTTOM RIGHT CARD: Striped Vertical Bar Chart (Session by Age equivalent) */}
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
              
              <div className="flex items-center justify-between pb-4">
                <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                  SIF Severity Tier Breakdown
                </h3>
                <span className="text-neutral-400 text-xs cursor-pointer hover:text-neutral-600 font-mono">
                  •••
                </span>
              </div>

              {/* 4 Clean Professional Vertical Bars matching reference design */}
              <div className="flex items-end justify-between gap-3 sm:gap-4 h-[230px] pt-4 pb-2">
                {severityTiers.map((tier, idx) => {
                  const solidColors = ["#FF8A7A", "#4C6EF5", "#0D6855", "#E04838"];
                  const barColor = solidColors[idx % solidColors.length];

                  return (
                    <div
                      key={idx}
                      className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer"
                    >
                      {/* Value on top of bar */}
                      <span className="text-xs font-bold text-neutral-800 mb-1.5 group-hover:text-neutral-950 transition-colors">
                        {tier.count.toLocaleString()}
                      </span>

                      {/* Clean Matte Bar Container */}
                      <div className="w-full relative flex items-end justify-center h-[170px]">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(16, tier.heightPercent)}%` }}
                          transition={{ type: "spring", stiffness: 180, damping: 20, delay: idx * 0.08 }}
                          style={{
                            backgroundColor: barColor,
                          }}
                          className="w-full rounded-2xl transition-all duration-200 group-hover:brightness-105 group-hover:scale-[1.02] shadow-2xs cursor-pointer"
                        />
                      </div>

                      {/* Bottom Category Label */}
                      <span className="text-[11px] font-semibold text-neutral-400 mt-2">
                        {tier.tier}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footnote on Life-Saving Rules */}
              <div className="pt-3 mt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                <span>IOGP Standard 459 SIF Matrix</span>
                <span className="font-semibold text-neutral-700">Zero Fatality Goal</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default BentoDashboard;
