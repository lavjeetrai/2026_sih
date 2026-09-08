"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Radio,
  Clock,
  MapPin,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Printer,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Mail,
} from "lucide-react";
import type { CardData } from "@/types";
import {
  mapToLifeSavingRule,
  resolveAuthoritativeLSR,
  resolveMultiLSR,
  IOGP_LIFE_SAVING_RULES,
  type LifeSavingRule,
} from "@/lib/safety";
import { type UserSessionData } from "@/components/landing/auth-form-1";
import {
  CompactProfileCard,
  type SocialLink,
} from "@/components/landing/animated-profile-card";

interface CardDetailModalProps {
  card: CardData | null;
  columnTitle: string;
  columnId: string;
  onClose: () => void;
  onMoveColumn: (cardId: string, targetColId: string) => void;
  onDeleteCard?: (colId: string, cardId: string) => void;
  currentManager?: UserSessionData | null;
}

function getCleanObservation(card: CardData): string {
  const obs = card.observation || "";
  if (obs.includes("|")) {
    const match = obs.match(/Observation:\s*(.+)$/i);
    if (match) return match[1].trim();
    const parts = obs.split("|").map((s) => s.trim());
    const lastPart = parts[parts.length - 1];
    if (lastPart.toLowerCase().startsWith("observation:")) {
      return lastPart.replace(/^observation:\s*/i, "").trim();
    }
    if (card.evidence_quote) {
      return card.evidence_quote;
    }
  }
  return obs || card.description || "No observation narrative recorded.";
}

// Persistent suggestions cache per card ID so suggestions stay completely stable and don't re-fetch on poll
const suggestionCache = new Map<string, string[]>();

export function CardDetailModal({
  card,
  columnTitle,
  columnId,
  onClose,
  onMoveColumn,
  onDeleteCard,
  currentManager,
}: CardDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const cardId = card?.id;

  // Load or fetch suggestions once per card ID
  useEffect(() => {
    if (!cardId || !card) return;

    // 1. If card already has suggestions attached
    if (card.llmSuggestions && card.llmSuggestions.length > 0) {
      setSuggestions(card.llmSuggestions);
      suggestionCache.set(cardId, card.llmSuggestions);
      return;
    }

    // 2. If cached in memory for this card
    const cached = suggestionCache.get(cardId);
    if (cached && cached.length > 0) {
      setSuggestions(cached);
      return;
    }

    // 3. Otherwise fetch once
    fetchSuggestions(false);
  }, [cardId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const fetchSuggestions = async (forceRefresh = false) => {
    if (!card) return;
    if (!forceRefresh && cardId && suggestionCache.has(cardId)) {
      setSuggestions(suggestionCache.get(cardId)!);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: card.hazard || card.title,
          failed_barrier: card.failed_barrier,
          observation: getCleanObservation(card),
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        if (cardId) {
          suggestionCache.set(cardId, data.suggestions);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch suggestions:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const [activeCard, setActiveCard] = useState<CardData | null>(card);
  const [reviewMode, setReviewMode] = useState<"view" | "correct">("view");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [correctedHazard, setCorrectedHazard] = useState<string>("");
  const [correctedConsequence, setCorrectedConsequence] = useState<string>("");
  const [correctedBarrier, setCorrectedBarrier] = useState<string>("");
  const [correctedBarrierType, setCorrectedBarrierType] = useState<string>("");
  const [correctedRule, setCorrectedRule] = useState<string>("");
  const [correctedScore, setCorrectedScore] = useState<number>(75);
  const [savingReview, setSavingReview] = useState<boolean>(false);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  useEffect(() => {
    setActiveCard(card);
    if (card) {
      setCorrectedHazard(card.hazard || "");
      setCorrectedConsequence(card.possible_consequence || "");
      setCorrectedBarrier(card.failed_barrier || "");
      setCorrectedBarrierType(card.failed_barrier_type || "");
      setCorrectedRule(card.iogp_rule || "");
      setCorrectedScore(card.sif_score ?? (card.priority === "High" ? 85 : 50));
      setReviewNotes(card.reviewAudit?.notes || "");
    }
  }, [card]);

  const handleSaveReview = async (decision: "confirmed" | "corrected") => {
    const target = activeCard || card;
    if (!target) return;
    setSavingReview(true);
    setReviewFeedback(null);

    try {
      const originalAssessment = {
        hazard: target.hazard,
        possible_consequence: target.possible_consequence,
        failed_barrier: target.failed_barrier,
        failed_barrier_type: target.failed_barrier_type,
        iogp_rule: target.iogp_rule,
        iogp_rules: target.iogp_rules,
        sif_score: target.sif_score,
        sif_potential: target.sif_potential,
        sif_category: target.sif_category,
      };

      const correctedAssessment =
        decision === "corrected"
          ? {
              hazard: correctedHazard || target.hazard,
              possible_consequence: correctedConsequence || target.possible_consequence,
              failed_barrier: correctedBarrier || target.failed_barrier,
              failed_barrier_type: correctedBarrierType || target.failed_barrier_type,
              iogp_rule: correctedRule || target.iogp_rule,
              iogp_rules: correctedRule ? [correctedRule] : target.iogp_rules,
              sif_score: correctedScore,
              sif_potential: correctedScore >= 70,
              sif_category: (correctedScore >= 70 ? "HIGH" : correctedScore >= 40 ? "MEDIUM" : "LOW") as "HIGH" | "MEDIUM" | "LOW" | "REVIEW",
            }
          : undefined;

      const res = await fetch("/api/concerns/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: target.id,
          decision,
          notes: reviewNotes,
          originalAssessment,
          correctedAssessment,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save review");
      }

      setActiveCard(json.card);
      setReviewMode("view");
      setReviewFeedback(`HSE Review saved: ${decision === "confirmed" ? "Confirmed" : "Corrected"}`);
      setTimeout(() => setReviewFeedback(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving review";
      setReviewFeedback(`Error: ${msg}`);
    } finally {
      setSavingReview(false);
    }
  };

  const currentCard = activeCard || card;
  if (!currentCard) return null;
  const safeCard = currentCard;

  const sifScore =
    currentCard.sif_score ?? (currentCard.priority === "High" ? 85 : currentCard.priority === "Medium" ? 50 : 25);

  const getSifColor = (score: number) => {
    if (score >= 70)
      return { text: "text-red-700", bg: "bg-red-50", border: "border-red-200", bar: "bg-red-500" };
    if (score >= 40)
      return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-500" };
    return { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500" };
  };

  const sifColor = getSifColor(sifScore);
  const cleanObsText = getCleanObservation(currentCard);

  // PRIMARY: Stored model output (never overwritten by regex keyword matching)
  // SECONDARY: Rule-based mapping only when model provided no result
  const lsrList = resolveMultiLSR(
    currentCard.iogp_rules,
    currentCard.iogp_rule,
    currentCard.hazard,
    currentCard.failed_barrier,
    cleanObsText
  );
  const lsr =
    lsrList[0] ||
    resolveAuthoritativeLSR(currentCard.iogp_rule, currentCard.hazard, currentCard.failed_barrier, cleanObsText) || {
      number: 2,
      name: "Bypassing Safety Controls",
      shortLabel: "LSR #2: Safety Controls",
      mandate: "Obtain authorization before overriding, bypassing, or disabling any safety interlock or alarm.",
      category: "Procedural Compliance",
      color: "#f59e0b",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
      badgeBorder: "border-amber-200",
    };

  // Field Observer Profile Data
  const reporterName = safeCard.reporter?.name || "Field Officer";
  const reporterInitials =
    reporterName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FO";
  const reporterAvatar =
    safeCard.reporter?.avatarUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
  const reporterStation = safeCard.reporter?.station || "Moran Rig #04 • Wellhead Section";
  const reporterBadge = safeCard.reporter?.badgeId || "OIL-FLD-5542";
  const reporterRole = safeCard.reporter?.role || "HSE Field Safety Officer (Derrick Floor)";
  const reporterBio = `${reporterRole}. Assigned to rig observations, SIF precursor detection, and hazard mitigation at ${reporterStation}. Logged on ${safeCard.reportedAt || safeCard.date || "Sep 06, 2026 • 16:15 IST"}.`;

  const reporterSocials: SocialLink[] = [
    {
      id: "radio",
      url: "#",
      label: `Radio: ${safeCard.reporter?.radioChannel || "UHF CH-04"}`,
      icon: <Radio className="h-4 w-4" />,
    },
    {
      id: "phone",
      url: `tel:${safeCard.reporter?.phone || "+919435044521"}`,
      label: `Call: ${safeCard.reporter?.phone || "+91 94350 44521"}`,
      icon: <Phone className="h-4 w-4" />,
    },
    {
      id: "email",
      url: `mailto:${safeCard.reporter?.email || "lav.kumar@oilindia.in"}`,
      label: `Email: ${safeCard.reporter?.email || "lav.kumar@oilindia.in"}`,
      icon: <Mail className="h-4 w-4" />,
    },
  ];

  // Reviewing HSE Manager Profile Data (if assigned)
  const managerName = safeCard.reviewer?.name || "";
  const managerInitials =
    managerName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "MGR";
  const managerAvatar =
    safeCard.reviewer?.avatarUrl ||
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80";
  const managerStation = safeCard.reviewer?.station || "Duliajan Corporate HQ";
  const managerBadge = safeCard.reviewer?.badgeId || "OIL-MGR";
  const managerRole =
    safeCard.reviewer?.role ||
    "HSE Operations Manager";
  const managerBio = `${managerRole}. Authorized HSE Manager approving barrier verifications, SIF mitigation controls, and stage audits across ${managerStation}.`;

  const managerSocials: SocialLink[] = [
    {
      id: "radio",
      url: "#",
      label: `Command Freq: ${safeCard.reviewer?.radioChannel || "COMMAND CH-01"}`,
      icon: <Radio className="h-4 w-4" />,
    },
    {
      id: "phone",
      url: `tel:${safeCard.reviewer?.phone || "+913742804501"}`,
      label: `Direct: ${safeCard.reviewer?.phone || "+91 374 280 4501"}`,
      icon: <Phone className="h-4 w-4" />,
    },
    {
      id: "email",
      url: `mailto:${safeCard.reviewer?.email || "hse@oilindia.in"}`,
      label: `Email: ${safeCard.reviewer?.email || "hse@oilindia.in"}`,
      icon: <Mail className="h-4 w-4" />,
    },
  ];

  const handleCopySummary = () => {
    const text = `[OIL INDIA HSE REPORT]\nIssue: ${safeCard.title}\nSeverity: SIF ${sifScore}/100\nHazard: ${safeCard.hazard || "N/A"}\nFailed Barrier: ${safeCard.failed_barrier || "N/A"}\nReported by: ${safeCard.reporter?.name || "Field Officer"} (${safeCard.reportedAt || safeCard.date})\nObservation: ${cleanObsText}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPlan = () => {
    const text = suggestions.map((s, idx) => `Step ${idx + 1}: ${s}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-900/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col font-sans"
        >
          {/* Top Bar / Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80 shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-red-100 text-red-800 border border-red-200">
                OIL INDIA HSE • INCIDENT DOSSIER
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                Stage: <span className="text-neutral-800 font-bold">{columnTitle}</span>
              </span>
              <span className="text-xs font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                REF: #{safeCard.id.slice(-6).toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors shadow-2xs"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Brief"}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg transition-colors shadow-2xs hidden sm:inline-flex"
              >
                <Printer size={14} /> Print
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200/60 transition-colors ml-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Top Metrics */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-neutral-100">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  {safeCard.priority && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${
                        safeCard.priority === "High"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : safeCard.priority === "Medium"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {safeCard.priority} Priority
                    </span>
                  )}
                  {safeCard.tags?.map((tag, idx) => {
                    const fullTagLabel =
                      tag.label.endsWith("...") && safeCard.hazard
                        ? safeCard.hazard.replace(/\(.*\)/, "").trim()
                        : tag.label;
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tag.dotColor}`} />
                        {fullTagLabel}
                      </span>
                    );
                  })}
                  {safeCard.inference_engine && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                        safeCard.inference_engine === "modal"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          safeCard.inference_engine === "modal" ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                      />
                      {safeCard.inference_engine === "modal" ? "Fine-Tuned SLM (Modal)" : "Edge Ollama (Local)"}
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight leading-snug">
                  {safeCard.title.endsWith("...") && safeCard.observation
                    ? safeCard.hazard
                      ? `${safeCard.hazard} — ${safeCard.observation}`
                      : safeCard.observation
                    : safeCard.title}
                </h2>
              </div>

              {/* SIF Density Gauge Badge */}
              <div
                className={`shrink-0 p-3.5 rounded-xl border ${sifColor.border} ${sifColor.bg} flex flex-col items-center justify-center text-center min-w-[150px] shadow-2xs`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  SIF Precursor Density
                </span>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span className={`text-2xl font-black ${sifColor.text}`}>{sifScore}</span>
                  <span className="text-xs font-semibold text-neutral-400">/100</span>
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full ${sifColor.bar} transition-all duration-500`}
                    style={{ width: `${Math.min(100, sifScore)}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold mt-1.5 ${sifColor.text}`}>
                  {sifScore >= 70
                    ? "CRITICAL SIF RISK"
                    : sifScore >= 40
                    ? "MODERATE SIF RISK"
                    : "CONTROLLED SIF RISK"}
                </span>
              </div>
            </div>

            {/* 2-Column Responsive Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (Reporter Profile & Observation Narrative) - 5 cols */}
              <div className="lg:col-span-5 space-y-4">
                {/* Field Observer Compact Profile Card */}
                <CompactProfileCard
                  badgeTitle="Field Observer Profile"
                  badgeId={reporterBadge}
                  name={reporterName}
                  role={reporterRole}
                  location={`${reporterStation} • ${safeCard.reportedAt || safeCard.date || "Sep 06, 2026 • 16:15 IST"}`}
                  bio={`SIF Precursor Monitor • Logged observation & barrier condition alert at ${reporterStation}.`}
                  avatarSrc={reporterAvatar}
                  avatarFallback={reporterInitials}
                  socials={reporterSocials}
                  themeVariant="emerald"
                />

                {/* Field Observation Narrative */}
                <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      Field Observation
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      REF #{safeCard.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-sans bg-neutral-50/70 p-2.5 rounded-lg border border-neutral-200/60">
                    {cleanObsText}
                  </p>
                </div>

                {/* Reviewing HSE Manager Compact Profile Card / Pending Assignment */}
                {safeCard.reviewer ? (
                  <CompactProfileCard
                    badgeTitle="Reviewing HSE Manager"
                    badgeId={managerBadge}
                    badgeIcon={<ShieldCheck size={14} className="text-blue-600" />}
                    name={managerName}
                    role={managerRole}
                    location={`${managerStation} • Active Reviewer`}
                    bio={`HSE Process Lead • Reviewing barrier restoration, work-order clearances, and audit workflows.`}
                    avatarSrc={managerAvatar}
                    avatarFallback={managerInitials}
                    socials={managerSocials}
                    themeVariant="blue"
                  />
                ) : (
                  <div className="bg-white border border-dashed border-neutral-300 rounded-xl p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        Reviewing HSE Manager
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Assignment
                      </span>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80 flex items-center justify-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        AWAITING FOR MANAGER REVIEW
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Structured AI Extraction & Recommendations) - 7 cols */}
              <div className="lg:col-span-7 space-y-4">
                {/* Official IOGP Life-Saving Rule (LSR) Alignment Card */}
                <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      IOGP Life-Saving Rule Alignment
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${lsr.badgeBg} ${lsr.badgeText} ${lsr.badgeBorder}`}
                      >
                        {lsr.shortLabel}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 leading-tight">
                      Rule #{lsr.number}: {lsr.name}
                    </h4>
                    <p className="text-xs italic text-neutral-600 mt-1 leading-relaxed pl-2.5 border-l-2 border-neutral-300">
                      &ldquo;{lsr.mandate}&rdquo;
                    </p>
                  </div>

                  {/* Multi-label LSR badges if multiple rules are relevant */}
                  {lsrList.length > 1 && (
                    <div className="pt-2 border-t border-neutral-100 mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">Additional Mapped Rules:</span>
                      {lsrList.slice(1).map((rule, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${rule.badgeBg} ${rule.badgeText} ${rule.badgeBorder}`}
                        >
                          {rule.shortLabel}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Structured Safety Classification Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Primary Hazard Card */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                          Primary Hazard
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          Class A
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 leading-snug pt-1">
                        {currentCard.hazard || "Operational Hazard"}
                      </h4>
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-2 font-medium">
                      IOGP Life-Saving Rules Core Domain
                    </span>
                  </div>

                  {/* Breached Barrier Card */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                          Breached Barrier System
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                          Failed
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 leading-snug pt-1">
                        {currentCard.failed_barrier || "Safety Barrier Control"}
                      </h4>
                    </div>
                    <span className="text-[10px] text-red-600 font-semibold mt-2">
                      Physical / Administrative Defense Compromised
                    </span>
                  </div>

                  {/* Potential Serious Consequence Card (Decoupled SIF Outcome) */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between md:col-span-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                          Potential Serious Consequence (SIF Outcome)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Precursor Worst Case
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 leading-snug pt-1">
                        {currentCard.possible_consequence || "Severe personal injury, acute occupational trauma, or containment breach"}
                      </h4>
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-2 font-medium">
                      Decoupled consequence analysis: identifies credible severe injury/fatality mechanisms separate from the initiating hazard
                    </span>
                  </div>
                </div>

                {/* Fine-Tuned Model Context & Traceability Card */}
                {(currentCard.failed_barrier_type || currentCard.operational_activity || currentCard.site_location || currentCard.analysis_engine) && (
                  <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                        Fine-Tuned Model Extractions & Traceability
                      </span>
                      {currentCard.analysis_engine && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Engine: {currentCard.analysis_engine}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-neutral-100">
                      {currentCard.failed_barrier_type && (
                        <div>
                          <span className="text-[10px] font-semibold text-neutral-400 block">Barrier Type</span>
                          <span className="font-semibold text-neutral-800">{currentCard.failed_barrier_type}</span>
                        </div>
                      )}
                      {currentCard.operational_activity && (
                        <div>
                          <span className="text-[10px] font-semibold text-neutral-400 block">Operational Activity</span>
                          <span className="font-semibold text-neutral-800">{currentCard.operational_activity}</span>
                        </div>
                      )}
                      {currentCard.site_location && (
                        <div>
                          <span className="text-[10px] font-semibold text-neutral-400 block">Site Location</span>
                          <span className="font-semibold text-neutral-800">{currentCard.site_location}</span>
                        </div>
                      )}
                    </div>
                    {currentCard.model_name && (
                      <div className="pt-1.5 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
                        <span>Model: {currentCard.model_name} (v{currentCard.model_version || "unknown"})</span>
                        <span>Analyzed: {currentCard.analyzed_at ? new Date(currentCard.analyzed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " IST" : "Real-time"}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Corrective Actions & Recommendations (Clean White Enterprise Card) */}
                <div className="bg-white border border-neutral-200/90 rounded-xl p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold tracking-tight text-neutral-900">
                          Corrective Actions & Safety Recommendations
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                          safety-phi3
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Actionable field restoration steps for site supervisors
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyPlan}
                        className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200 flex items-center gap-1 shadow-2xs"
                        title="Copy suggestions"
                      >
                        {copiedPlan ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        {copiedPlan ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchSuggestions(true)}
                        disabled={loadingSuggestions}
                        className="p-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200 disabled:opacity-50 shadow-2xs"
                        title="Regenerate tips from Ollama"
                      >
                        <RefreshCw
                          size={14}
                          className={loadingSuggestions ? "animate-spin text-neutral-700" : ""}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Suggestions List in Clean White/Neutral Style */}
                  {loadingSuggestions ? (
                    <div className="space-y-2.5 py-1">
                      <div className="h-14 bg-neutral-100 rounded-lg animate-pulse" />
                      <div className="h-14 bg-neutral-100 rounded-lg animate-pulse" />
                      <div className="h-14 bg-neutral-100 rounded-lg animate-pulse" />
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {suggestions.map((step, idx) => (
                        <div
                          key={idx}
                          className="bg-neutral-50 border border-neutral-200/80 rounded-lg p-3.5 flex items-start gap-3 hover:border-neutral-300 transition-colors"
                        >
                          <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                              {step}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-100">
                    <span>OIL India HSE Standard Operating Guidelines</span>
                    <span className="text-neutral-600 font-semibold">Zero SIF Target 2026</span>
                  </div>
                </div>

                {/* HSE Manager Review & Verification Governance Panel */}
                <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-blue-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                        HSE Manager Review & Audit Trail
                      </h4>
                    </div>
                    {currentCard.humanReviewed ? (
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        currentCard.reviewAudit?.decision === "confirmed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {currentCard.reviewAudit?.decision === "confirmed" ? "AI Verified / Confirmed" : "HSE Corrected"}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                        Pending HSE Verification
                      </span>
                    )}
                  </div>

                  {reviewFeedback && (
                    <div className="p-2.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {reviewFeedback}
                    </div>
                  )}

                  {/* Audit record details if already reviewed */}
                  {currentCard.humanReviewed && currentCard.reviewAudit && reviewMode === "view" ? (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-neutral-700">
                            Reviewed by: {currentCard.reviewAudit.reviewedBy.name} ({currentCard.reviewAudit.reviewedBy.badgeId})
                          </span>
                          <span className="text-neutral-400">
                            {new Date(currentCard.reviewAudit.reviewedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-neutral-600 italic">
                          &ldquo;{currentCard.reviewAudit.notes}&rdquo;
                        </p>
                      </div>

                      {/* Display original vs corrected comparison if corrected */}
                      {currentCard.reviewAudit.decision === "corrected" && currentCard.reviewAudit.correctedAssessment && (
                        <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200/60 text-[11px] space-y-1">
                          <span className="font-bold text-amber-900 block">Preserved Audit History:</span>
                          <div className="grid grid-cols-2 gap-2 text-neutral-600">
                            <div>
                              <span className="font-semibold text-neutral-500 block">Original AI Extraction:</span>
                              <span>Hazard: {currentCard.reviewAudit.originalAssessment.hazard || "N/A"}</span><br/>
                              {currentCard.reviewAudit.originalAssessment.possible_consequence && (
                                <><span>Consequence: {currentCard.reviewAudit.originalAssessment.possible_consequence}</span><br/></>
                              )}
                              <span>Barrier: {currentCard.reviewAudit.originalAssessment.failed_barrier || "N/A"}</span><br/>
                              <span>SIF Score: {currentCard.reviewAudit.originalAssessment.sif_score ?? "N/A"}</span>
                            </div>
                            <div>
                              <span className="font-semibold text-amber-800 block">Manager Approved Value:</span>
                              <span>Hazard: {currentCard.reviewAudit.correctedAssessment.hazard || "N/A"}</span><br/>
                              {currentCard.reviewAudit.correctedAssessment.possible_consequence && (
                                <><span>Consequence: {currentCard.reviewAudit.correctedAssessment.possible_consequence}</span><br/></>
                              )}
                              <span>Barrier: {currentCard.reviewAudit.correctedAssessment.failed_barrier || "N/A"}</span><br/>
                              <span>SIF Score: {currentCard.reviewAudit.correctedAssessment.sif_score ?? "N/A"}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setReviewMode("correct")}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 mt-1"
                      >
                        Modify Review / Add Notes
                      </button>
                    </div>
                  ) : (
                    /* Review Action & Correction Form */
                    <div className="space-y-3 text-xs">
                      {reviewMode === "view" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveReview("confirmed")}
                            disabled={savingReview}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                          >
                            <Check size={14} /> Confirm AI Assessment
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewMode("correct")}
                            className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs transition-colors border border-neutral-300 flex items-center gap-1.5 shadow-2xs"
                          >
                            Correct Classification
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-700 text-xs">Manager Classification Override</span>
                            <button
                              type="button"
                              onClick={() => setReviewMode("view")}
                              className="text-[11px] text-neutral-500 hover:text-neutral-800"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Corrected Hazard</label>
                              <input
                                type="text"
                                value={correctedHazard}
                                onChange={(e) => setCorrectedHazard(e.target.value)}
                                className="w-full text-xs p-1.5 bg-white border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                                placeholder="Hazard description"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Corrected Potential Consequence</label>
                              <input
                                type="text"
                                value={correctedConsequence}
                                onChange={(e) => setCorrectedConsequence(e.target.value)}
                                className="w-full text-xs p-1.5 bg-white border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                                placeholder="Worst-case credible consequence"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Corrected Failed Barrier</label>
                              <input
                                type="text"
                                value={correctedBarrier}
                                onChange={(e) => setCorrectedBarrier(e.target.value)}
                                className="w-full text-xs p-1.5 bg-white border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                                placeholder="Barrier control"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Corrected Barrier Type</label>
                              <input
                                type="text"
                                value={correctedBarrierType}
                                onChange={(e) => setCorrectedBarrierType(e.target.value)}
                                className="w-full text-xs p-1.5 bg-white border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                                placeholder="e.g. Harness or Lanyard, Gas Detector"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Life-Saving Rule</label>
                              <select
                                value={correctedRule}
                                onChange={(e) => setCorrectedRule(e.target.value)}
                                className="w-full text-xs p-1.5 bg-white border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                              >
                                <option value="">Select official LSR...</option>
                                {Object.values(IOGP_LIFE_SAVING_RULES).map((r) => (
                                  <option key={r.number} value={r.name}>
                                    Rule #{r.number}: {r.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                                SIF Risk Score: <span className="font-bold text-neutral-800">{correctedScore}/100</span>
                              </label>
                              <input
                                type="range"
                                min="10"
                                max="95"
                                step="5"
                                value={correctedScore}
                                onChange={(e) => setCorrectedScore(parseInt(e.target.value, 10))}
                                className="w-full cursor-pointer accent-red-600"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-neutral-500 block mb-1">HSE Manager Notes / Rationale</label>
                            <textarea
                              rows={2}
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder="Describe why this correction was applied..."
                              className="w-full text-xs p-1.5 bg-white border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveReview("corrected")}
                              disabled={savingReview}
                              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                            >
                              {savingReview ? "Saving..." : "Save Corrected Assessment"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setReviewMode("view")}
                              className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-700 font-semibold text-xs border border-neutral-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Sticky Action Bar */}
          <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500">Quick Workflow Transitions:</span>
              {columnId !== "col-1" && (
                <button
                  type="button"
                  onClick={() => onMoveColumn(safeCard.id, "col-1")}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors shadow-2xs"
                >
                  Move to To Do
                </button>
              )}
              {columnId !== "col-2" && (
                <button
                  type="button"
                  onClick={() => onMoveColumn(safeCard.id, "col-2")}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1.5"
                >
                  Move to In Progress <ArrowRight size={13} />
                </button>
              )}
              {columnId !== "col-3" && (
                <button
                  type="button"
                  onClick={() => onMoveColumn(safeCard.id, "col-3")}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 size={13} /> Mark Resolved / Done
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onDeleteCard && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCard?.(columnId, safeCard.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Delete Issue
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm"
              >
                Close View
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
