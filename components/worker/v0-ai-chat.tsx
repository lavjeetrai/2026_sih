"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ArrowUpIcon,
    History,
    Loader2,
    RefreshCw,
    XCircle,
} from "lucide-react";
import { AnimatedTicket } from "@/components/worker/ticket-confirmation-card";
import { type UserSessionData } from "@/components/landing/auth-form-1";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );
            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

// Authentic Web Audio chime replicating UPI confirmation sound
function playConfirmationChime() {
    try {
        const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.4);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(783.99, now + 0.12);
        osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.24);
        gain2.gain.setValueAtTime(0.25, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.75);
    } catch {
        // Fallback if blocked
    }
}

interface VercelV0ChatProps {
    user?: UserSessionData | null;
    onViewHistory?: () => void;
}

export function VercelV0Chat({ user, onViewHistory }: VercelV0ChatProps = {}) {
    const [value, setValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [lastAnalyzedObservation, setLastAnalyzedObservation] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [referenceCode, setReferenceCode] = useState<string>("");
    const [engineStatus, setEngineStatus] = useState<{
        checked: boolean;
        online: boolean;
        activeEngine: "modal" | "ollama";
        model: string;
        modalOnline: boolean;
        ollamaOnline: boolean;
    }>({
        checked: false,
        online: false,
        activeEngine: "modal",
        model: "Fine-Tuned SLM (Modal Cloud)",
        modalOnline: false,
        ollamaOnline: false,
    });
    const [selectedEngine, setSelectedEngine] = useState<"auto" | "modal" | "ollama">("auto");
    const [lastAnalyzedEngine, setLastAnalyzedEngine] = useState<string>("");

    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });

    // Check dual-engine status on mount
    useEffect(() => {
        async function fetchStatus() {
            try {
                const res = await fetch("/api/analyze", { method: "GET" });
                const data = await res.json();
                setEngineStatus({
                    checked: true,
                    online: Boolean(data.online),
                    activeEngine: data.activeEngine || (data.modal?.online ? "modal" : "ollama"),
                    model: data.model || "Fine-Tuned SLM",
                    modalOnline: Boolean(data.modal?.online),
                    ollamaOnline: Boolean(data.ollama?.online),
                });
            } catch {
                setEngineStatus({
                    checked: true,
                    online: false,
                    activeEngine: "modal",
                    model: "Fine-Tuned SLM",
                    modalOnline: false,
                    ollamaOnline: false,
                });
            }
        }
        fetchStatus();
    }, []);

    const handleAnalyze = async (textToAnalyze?: string) => {
        const query = (textToAnalyze ?? value).trim();
        if (!query || isLoading) return;

        setIsLoading(true);
        setError(null);
        setLastAnalyzedObservation(query);

        try {
            const reporterPayload = user
                ? {
                      name: user.name,
                      role:
                          user.designation ||
                          (user.role === "worker"
                              ? "HSE Field Safety Officer (Derrick Floor)"
                              : "HSE Operations Manager"),
                      email: user.email,
                      station: user.station || "Moran Rig #04 • Wellhead Section",
                      radioChannel: user.radioChannel || "UHF CH-04",
                      badgeId: user.badgeId || "OIL-FLD-5542",
                      phone: user.phone || "+91 94350 44521",
                      avatarUrl: user.avatarUrl,
                  }
                : undefined;

            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    observation: query,
                    engine: selectedEngine === "auto" ? undefined : selectedEngine,
                    reporter: reporterPayload,
                }),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || "Failed to log concern.");
            }

            if (json.data?.engine) {
                setLastAnalyzedEngine(json.data.engine === "modal" ? "Modal Cloud SLM" : "Local Ollama");
            }

            // Generate clean reference code
            const ref = `OIL-HSE-${Math.floor(100000 + Math.random() * 900000)}`;
            setReferenceCode(ref);

            // Play confirmation chime
            playConfirmationChime();

            setIsSubmitted(true);
            setValue("");
            adjustHeight(true);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAnalyze();
        }
    };

    return (
        <div className="relative w-full h-full min-h-full flex-1 flex flex-col items-center justify-center p-4">
            {isSubmitted ? (
                /* Ticket Confirmation Card with Confetti Explosion */
                <div className="w-full flex items-center justify-center my-auto animate-in fade-in zoom-in-95 duration-500">
                    <AnimatedTicket
                        ticketId={referenceCode}
                        date={new Date()}
                        cardHolder={user?.name ? `${user.name} (${user.badgeId || "OIL-FLD"})` : "Field Officer (OIL)"}
                        last4Digits={user?.badgeId ? user.badgeId.slice(-4) : "5542"}
                        barcodeValue={referenceCode.replace(/\D/g, "") || "928374829104"}
                        title="YOUR CONCERN IS RECORDED."
                        subtitle="THANKS FOR REPORTING."
                        metaLabel="Operating Base"
                        metaValue={user?.station || "Moran Rig #04"}
                        observation={lastAnalyzedObservation}
                        officerBadge={user?.badgeId || "OIL-FLD-5542"}
                        officerStation={user?.station || "Moran Rig #04"}
                        onReset={() => {
                            setIsSubmitted(false);
                            setValue("");
                            adjustHeight(true);
                        }}
                        onViewHistory={onViewHistory}
                    />
                </div>
            ) : (
                /* Standard Observation Input Form */
                <div className="w-full max-w-4xl mx-auto space-y-6 my-auto">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
                            OIL AI Safety Intelligence
                        </h1>
                        <p className="text-sm text-neutral-500 max-w-xl">
                            Log unsafe acts, unsafe conditions, or field observations. Concerns are automatically analyzed and forwarded to the HSE Manager for resolution.
                        </p>

                        {/* AI Engine Status & Smart Switcher */}
                        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-50/90 hover:bg-neutral-100/90 border border-neutral-200/80 shadow-2xs transition-all">
                                <span
                                    className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        engineStatus.online ? "bg-emerald-500 animate-pulse" : "bg-red-400"
                                    )}
                                />
                                <span className="text-[11px] text-neutral-500 font-medium">Model Engine:</span>
                                <select
                                    value={selectedEngine}
                                    onChange={(e) => setSelectedEngine(e.target.value as "auto" | "modal" | "ollama")}
                                    className="bg-transparent text-[11px] font-semibold text-neutral-800 cursor-pointer focus:outline-none pr-1"
                                    disabled={isLoading}
                                    title="Switch AI Inference Engine"
                                >
                                    <option value="auto">
                                        ⚡ Auto-Route ({engineStatus.activeEngine === "modal" ? "Modal Cloud SLM" : "Local Ollama"})
                                    </option>
                                    <option value="modal">
                                        ☁️ Fine-Tuned SLM (Modal Cloud) {engineStatus.modalOnline ? "• Live" : "• Offline"}
                                    </option>
                                    <option value="ollama">
                                        💻 Edge Ollama (safety-phi3) {engineStatus.ollamaOnline ? "• Live" : "• Offline"}
                                    </option>
                                </select>
                            </div>
                            {lastAnalyzedEngine && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium animate-in fade-in duration-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>Analyzed via {lastAnalyzedEngine}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input Box */}
                    <div className="w-full">
                        <div className="relative bg-white rounded-xl border border-neutral-200 shadow-sm focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200 transition-all">
                            <div className="overflow-y-auto">
                                <Textarea
                                    ref={textareaRef}
                                    value={value}
                                    onChange={(e) => {
                                        setValue(e.target.value);
                                        adjustHeight();
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Describe an observation, near-miss report, or field incident..."
                                    className={cn(
                                        "w-full px-4 py-3",
                                        "resize-none",
                                        "bg-transparent",
                                        "border-none",
                                        "text-neutral-900 text-sm",
                                        "focus:outline-none",
                                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                                        "placeholder:text-neutral-400 placeholder:text-sm",
                                        "min-h-[60px]"
                                    )}
                                    style={{ overflow: "hidden" }}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 border-t border-neutral-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-neutral-400">
                                        Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono text-[10px]">Enter ↵</kbd> to submit
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleAnalyze()}
                                        disabled={!value.trim() || isLoading}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                                            value.trim() && !isLoading
                                                ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs"
                                                : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                                        )}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Submit Concern</span>
                                                <ArrowUpIcon className="w-3.5 h-3.5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold">Submission Error</p>
                                <p className="text-xs mt-0.5 text-red-600">{error}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleAnalyze()}
                                className="px-2.5 py-1 bg-white border border-red-200 hover:bg-red-100 rounded-md text-xs font-medium text-red-700 cursor-pointer flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
