"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, Activity, Building2 } from "lucide-react";

// =========================================
// 1. BRUTALIST BAR CHART (SITE SIF DENSITY)
// =========================================
interface BarItem {
  label: string;
  value: number;
  incidentCount?: number;
  criticalCount?: number;
  color: string;
}

const DEFAULT_BAR_DATA: BarItem[] = [
  { label: "MORAN RIG-4", value: 82, color: "bg-red-400" },
  { label: "NAHARKATIYA", value: 68, color: "bg-yellow-400" },
  { label: "DULIAJAN GGS", value: 45, color: "bg-blue-400" },
  { label: "DIGBOI STN", value: 28, color: "bg-green-400" },
  { label: "PIPELINE 4B", value: 14, color: "bg-purple-400" },
];

const BrutalistBarChart = ({ data = DEFAULT_BAR_DATA }: { data?: BarItem[] }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const chartData = data && data.length > 0 ? data : DEFAULT_BAR_DATA;

  return (
    <div className="w-full h-full bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] relative flex flex-col p-6 transition-colors duration-200">
      <div className="flex items-center justify-between border-b-[3px] border-black dark:border-white pb-2 mb-6">
        <h3 className="font-black uppercase text-xl text-black dark:text-white">
          Site SIF-Precursor Density
        </h3>
        <span className="text-xs font-mono font-bold uppercase bg-black text-white px-2 py-0.5">
          Live Ranking
        </span>
      </div>
      <div className="flex justify-between items-end flex-1 gap-2 sm:gap-4 min-h-[150px]">
        {chartData.map((item, i) => (
          <div key={i} className="relative flex-1 h-full flex items-end group">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${item.value}%` }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: i * 0.1,
              }}
              onHoverStart={() => setHovered(i)}
              onHoverEnd={() => setHovered(null)}
              className={cn(
                "w-full border-[3px] border-black dark:border-white relative z-10 cursor-pointer origin-bottom flex items-center justify-center overflow-hidden",
                item.color
              )}
              whileHover={{ scaleY: 1.1, scaleX: 1.05 }}
              whileTap={{ scaleY: 0.95 }}
            >
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]" />
              <span className="relative z-20 font-bold text-[10px] sm:text-xs font-mono text-black/90 group-hover:text-black transition-colors px-1 text-center truncate">
                {item.label}
              </span>
            </motion.div>
            <AnimatePresence>
              {hovered === i && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full -mb-2 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 text-xs font-black whitespace-nowrap border-[3px] border-black dark:border-white z-30 pointer-events-none shadow-sm"
                >
                  <div>SIF Density: {item.value}%</div>
                  {item.incidentCount !== undefined && (
                    <div className="text-[10px] font-mono text-neutral-300 dark:text-neutral-600">
                      {item.incidentCount} reports ({item.criticalCount || 0} critical)
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 2. LIFE-SAVING RULES (LSR) RADAR CHART
// ==========================================
interface RadarItem {
  label: string;
  value: number;
  count?: number;
  color: string;
}

const DEFAULT_RADAR_DATA: RadarItem[] = [
  { label: "LINE OF FIRE", value: 88, color: "#ef4444" },
  { label: "HEIGHT WORK", value: 76, color: "#f97316" },
  { label: "ENERGY ISOLATION", value: 64, color: "#facc15" },
  { label: "SAFE LIFTING", value: 58, color: "#38bdf8" },
  { label: "CONFINED SPACE", value: 42, color: "#a855f7" },
];

const RADAR_SIZE = 200;
const CENTER = RADAR_SIZE / 2;
const RADIUS = 80;

const angleToRad = (angle: number) => (Math.PI / 180) * angle;

const BrutalistRadarChart = ({ data = DEFAULT_RADAR_DATA }: { data?: RadarItem[] }) => {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const radarData = data && data.length > 0 ? data : DEFAULT_RADAR_DATA;
  const numAxes = radarData.length;

  const getCoords = (value: number, index: number) => {
    const angle = angleToRad((360 / numAxes) * index - 90);
    const r = (value / 100) * RADIUS;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
    };
  };

  const pathData =
    radarData
      .map((d, i) => {
        const coords = getCoords(d.value, i);
        return `${i === 0 ? "M" : "L"} ${coords.x} ${coords.y}`;
      })
      .join(" ") + " Z";

  const gridLevels = [100, 75, 50, 25];

  return (
    <div className="w-full h-full bg-zinc-50 dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 flex flex-col sm:flex-row gap-6 relative overflow-hidden transition-colors duration-200">
      {/* LEFT: CHART AREA */}
      <div className="flex-1 flex items-center justify-center relative min-h-[250px]">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 dark:opacity-10">
          <span className="text-8xl font-black uppercase text-black dark:text-white">LSR</span>
        </div>

        <svg viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} className="w-full h-full max-w-75 overflow-visible">
          {/* Grid Background */}
          {gridLevels.map((level, lvlIdx) => (
            <path
              key={lvlIdx}
              d={
                radarData
                  .map((_, i) => {
                    const c = getCoords(level, i);
                    return `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`;
                  })
                  .join(" ") + " Z"
              }
              fill="none"
              className="stroke-black/10 dark:stroke-white/10"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          ))}

          {/* Axes Lines */}
          {radarData.map((_, i) => {
            const outer = getCoords(100, i);
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={outer.x}
                y2={outer.y}
                className="stroke-black/10 dark:stroke-white/10"
                strokeWidth="2"
              />
            );
          })}

          {/* The Data Polygon */}
          <motion.path
            d={pathData}
            fill="rgba(239, 68, 68, 0.4)"
            className="stroke-black dark:stroke-white"
            strokeWidth="4"
            strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.2,
            }}
            style={{ originX: "50%", originY: "50%" }}
          />

          {/* Interactive Points */}
          {radarData.map((d, i) => {
            const coords = getCoords(d.value, i);
            const isHovered = hoveredMetric === d.label;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredMetric(d.label)}
                onMouseLeave={() => setHoveredMetric(null)}
                className="cursor-pointer"
              >
                <circle cx={coords.x} cy={coords.y} r="20" fill="transparent" />
                <motion.circle
                  cx={coords.x}
                  cy={coords.y}
                  r="6"
                  fill={isHovered ? d.color : "currentColor"}
                  className="fill-white dark:fill-zinc-900 stroke-black dark:stroke-white"
                  strokeWidth="3"
                  animate={{
                    scale: isHovered ? 2 : 1,
                    strokeWidth: isHovered ? 4 : 3,
                    fill: isHovered ? d.color : "var(--dot-bg, white)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* RIGHT: STATS LIST */}
      <div className="w-full sm:w-44 flex flex-col justify-center gap-2 z-10">
        <h3 className="font-black uppercase text-base sm:text-lg mb-2 border-b-[3px] border-black dark:border-white pb-2 text-black dark:text-white">
          IOGP Rules
        </h3>
        {radarData.map((item, i) => (
          <motion.div
            key={i}
            onMouseEnter={() => setHoveredMetric(item.label)}
            onMouseLeave={() => setHoveredMetric(null)}
            className="flex items-center justify-between p-1.5 border-2 border-transparent hover:border-black dark:hover:border-white hover:bg-white dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            animate={{
              x: hoveredMetric === item.label ? 6 : 0,
            }}
          >
            <div className="flex items-center gap-1.5 truncate">
              <div
                className="w-2.5 h-2.5 shrink-0 border-2 border-black dark:border-white"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11px] font-bold font-mono text-black dark:text-zinc-200 truncate">
                {item.label}
              </span>
            </div>
            <span className="font-black text-xs text-black dark:text-white shrink-0 ml-1">
              {item.value}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// =========================================
// 3. BRUTALIST DONUT CHART
// =========================================
interface DonutItem {
  label: string;
  value: number;
  count?: number;
  color: string;
}

const DEFAULT_PIE_DATA: DonutItem[] = [
  { label: "SIF-P", value: 42, color: "#f87171" },
  { label: "Unsafe Acts", value: 28, color: "#4ade80" },
  { label: "Unsafe Conditions", value: 18, color: "#60a5fa" },
  { label: "Near Misses", value: 12, color: "#fbbf24" },
];

const springConfig = { type: "spring" as const, stiffness: 300, damping: 20 };
const getPieCoords = (percent: number) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
};

const BrutalistDonut = ({ data = DEFAULT_PIE_DATA }: { data?: DonutItem[] }) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const pieData = data && data.length > 0 ? data : DEFAULT_PIE_DATA;

  const slicesWithCoords = pieData.reduce<
    Array<{
      label: string;
      value: number;
      color: string;
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      largeArcFlag: number;
    }>
  >((acc, slice) => {
    const lastEnd =
      acc.length > 0
        ? acc[acc.length - 1].endX !== undefined
          ? pieData.slice(0, acc.length).reduce((sum, s) => sum + s.value, 0) / 100
          : 0
        : 0;
    const startPercent = lastEnd;
    const endPercent = lastEnd + slice.value / 100;
    const [startX, startY] = getPieCoords(startPercent);
    const [endX, endY] = getPieCoords(endPercent);
    const largeArcFlag = slice.value / 100 > 0.5 ? 1 : 0;

    acc.push({
      ...slice,
      startX,
      startY,
      endX,
      endY,
      largeArcFlag,
    });
    return acc;
  }, []);

  return (
    <div className="w-full h-full bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 flex flex-col items-center justify-between overflow-hidden relative transition-colors duration-200">
      <div className="w-full flex justify-between items-center border-b-[3px] border-black dark:border-white pb-2 mb-4 z-10">
        <h3 className="font-black uppercase text-xl text-black dark:text-white">
          Severity Breakdown
        </h3>
        <span className="text-xs font-mono font-bold uppercase bg-black text-white px-2 py-0.5">
          SIF Classification
        </span>
      </div>

      {/* SVG CONTAINER */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center my-auto">
        <motion.svg
          viewBox="-1.2 -1.2 2.4 2.4"
          className="w-full h-full -rotate-90 overflow-visible"
        >
          {slicesWithCoords.map((slice, i) => {
            const isHovered = hoveredSlice === slice.label;
            const path = `M ${slice.startX} ${slice.startY} A 1 1 0 ${slice.largeArcFlag} 1 ${slice.endX} ${slice.endY} L 0 0 Z`;

            return (
              <motion.path
                key={slice.label}
                d={path}
                fill={slice.color}
                className="stroke-black dark:stroke-white cursor-pointer"
                strokeWidth="0.04"
                strokeLinejoin="round"
                onMouseEnter={() => setHoveredSlice(slice.label)}
                onMouseLeave={() => setHoveredSlice(null)}
                animate={{
                  scale: isHovered ? 1.08 : 1,
                  filter: isHovered ? "brightness(1.1)" : "brightness(1)",
                }}
                transition={springConfig}
                initial={{ scale: 0 }}
                whileTap={{ scale: 0.95 }}
              />
            );
          })}

          <motion.circle
            cx="0"
            cy="0"
            r="0.55"
            className="fill-white dark:fill-zinc-900 stroke-black dark:stroke-white"
            strokeWidth="0.04"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, ...springConfig }}
          />
        </motion.svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <AnimatePresence mode="popLayout">
            {hoveredSlice ? (
              <motion.div
                key="hover-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center"
              >
                <span className="text-xl font-black leading-none text-black dark:text-white">
                  {pieData.find((d) => d.label === hoveredSlice)?.value}%
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-black dark:bg-white text-white dark:text-black px-1 mt-1">
                  {hoveredSlice}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="default-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center"
              >
                <span className="text-3xl font-black leading-none text-black dark:text-white">
                  100%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  TOTAL
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="w-full mt-6 grid grid-cols-2 gap-2">
        {pieData.map((item) => (
          <motion.div
            key={item.label}
            onMouseEnter={() => setHoveredSlice(item.label)}
            onMouseLeave={() => setHoveredSlice(null)}
            animate={{
              opacity: hoveredSlice && hoveredSlice !== item.label ? 0.3 : 1,
              scale: hoveredSlice === item.label ? 1.05 : 1,
            }}
            className="flex items-center gap-2 p-2 border-2 border-transparent hover:border-black dark:hover:border-white hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <div
              className="w-3 h-3 border-2 border-black dark:border-white"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs font-bold uppercase text-black dark:text-white">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// =========================================
// 4. MAIN BENTO LAYOUT WITH LIVE AGGREGATION
// =========================================
export function BentoDashboard() {
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">("week");
  const [analytics, setAnalytics] = useState<{
    timeframe: string;
    timeframeLabel: string;
    siteSifDensity: BarItem[];
    lsrDistribution: RadarItem[];
    severityDonut: DonutItem[];
    kpis: {
      totalReports: number;
      criticalPrecursors: number;
      avgSifScore: number;
      highestRiskSite: string;
    };
  } | null>(null);

  const fetchAnalytics = async (tf = timeframe) => {
    try {
      const res = await fetch(`/api/analytics?timeframe=${tf}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data);
      }
    } catch (e) {
      console.warn("Could not fetch analytics:", e);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
    const interval = setInterval(() => fetchAnalytics(timeframe), 4000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const kpis = analytics?.kpis || {
    totalReports: 15,
    criticalPrecursors: 13,
    avgSifScore: 76,
    highestRiskSite: "MORAN RIG-4",
  };

  const timeframeLabels: Record<string, string> = {
    day: "Shift 24h",
    week: "7-Day Trailing",
    month: "30-Day Trailing",
    year: "Annual YTD",
  };

  return (
    <div className="w-full h-full bg-neutral-50 p-6 md:p-8 overflow-y-auto text-neutral-900 font-sans flex flex-col">
      <div className="max-w-7xl w-full mx-auto relative z-10 flex flex-col flex-1">
        <header className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-[3px] border-black pb-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-neutral-900">
              HSE Analytics & SIF Intelligence
            </h1>
            <p className="font-bold text-neutral-500 uppercase tracking-widest text-xs mt-1">
              {analytics?.timeframeLabel || "Live SIF-Precursor Density Aggregation & IOGP Life-Saving Rules"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timeframe Selector Button Group */}
            <div className="inline-flex p-1 bg-neutral-200 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              {(
                [
                  { key: "day", label: "Today" },
                  { key: "week", label: "This Week" },
                  { key: "month", label: "This Month" },
                  { key: "year", label: "This Year" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setTimeframe(tab.key);
                    fetchAnalytics(tab.key);
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-black uppercase tracking-wider transition-all duration-150 cursor-pointer",
                    timeframe === tab.key
                      ? "bg-black text-white shadow-xs"
                      : "text-neutral-700 hover:text-black hover:bg-neutral-300"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* TOP KPI CARDS (Aggregated Analytics) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Total Observations
            </span>
            <div className="text-2xl font-black text-neutral-900 mt-0.5">
              {kpis.totalReports} Reports
            </div>
            <span className="text-[10px] font-bold text-neutral-500">
              {timeframeLabels[timeframe]} Period
            </span>
          </div>

          <div className="bg-red-50 border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-700">
              Critical SIF Precursors
            </span>
            <div className="text-2xl font-black text-red-700 mt-0.5">
              {kpis.criticalPrecursors} High-Risk
            </div>
            <span className="text-[10px] font-bold text-red-600">
              SIF Precursor Density ≥ 70
            </span>
          </div>

          <div className="bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
              Avg Precursor Density
            </span>
            <div className="text-2xl font-black text-neutral-900 mt-0.5">
              {kpis.avgSifScore} / 100
            </div>
            <span className="text-[10px] font-bold text-neutral-500">
              Facility Risk Index ({timeframe.toUpperCase()})
            </span>
          </div>

          <div className="bg-amber-50 border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              Top Vulnerable Site
            </span>
            <div className="text-xl font-black text-amber-900 mt-0.5 truncate">
              {kpis.highestRiskSite}
            </div>
            <span className="text-[10px] font-bold text-amber-700">
              Priority Safety Action
            </span>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          {/* COLUMN 1: STACKED BAR + RADAR */}
          <div className="flex flex-col gap-6">
            <div className="w-full min-h-[360px]">
              <BrutalistBarChart data={analytics?.siteSifDensity} />
            </div>
            <div className="w-full min-h-[360px]">
              <BrutalistRadarChart data={analytics?.lsrDistribution} />
            </div>
          </div>

          {/* COLUMN 2: DONUT */}
          <div className="w-full min-h-[400px] flex">
            <div className="w-full h-full">
              <BrutalistDonut data={analytics?.severityDonut} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BentoDashboard;
