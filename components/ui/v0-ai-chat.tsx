"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ArrowUpIcon,
    Loader2,
    RefreshCw,
    XCircle,
    Mic,
    X,
    Check,
    Globe,
} from "lucide-react";
import { AnimatedTicket } from "@/components/ui/ticket-confirmation-card";
import { type UserSessionData } from "@/components/ui/auth-form-1";
import { SiriWave } from "@/components/ui/siri-wave";
import { LumaSpin } from "@/components/ui/luma-spin";

interface ISpeechRecognitionEvent {
    resultIndex: number;
    results: {
        length: number;
        [index: number]: {
            isFinal: boolean;
            [index: number]: {
                transcript: string;
            };
        };
    };
}

interface ISpeechRecognitionErrorEvent {
    error: string;
}

interface ISpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onstart?: () => void;
    onresult: (event: ISpeechRecognitionEvent) => void;
    onerror: (event: ISpeechRecognitionErrorEvent) => void;
    onend: () => void;
}

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

function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
    const [submittedInfo, setSubmittedInfo] = useState<{
        sifScore: number;
        isAutoEscalated: boolean;
        hazard?: string;
        hadVoiceNote?: boolean;
    } | null>(null);

    // Voice & SiriWave Modal State
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);
    const [speechTranscript, setSpeechTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [voiceDuration, setVoiceDuration] = useState(0);
    const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<"en-IN" | "hi-IN" | "en-US">("en-IN");
    const [micError, setMicError] = useState<string | null>(null);
    const [audioLevel, setAudioLevel] = useState(1.0);

    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isRecordingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Multi-cycle transcript accumulation refs (prevent speech loss across silences)
    const initialValueBeforeVoiceRef = useRef("");
    const accumulatedFinalRef = useRef("");
    const currentCycleFinalRef = useRef("");
    const interimTranscriptRef = useRef("");

    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });

    // Cleanup resources on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (audioContextRef.current) {
                try {
                    audioContextRef.current.close();
                } catch {}
            }
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {}
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    // Stop Voice Input & Close Modal
    const closeVoiceModal = useCallback((commitText: boolean = true) => {
        isRecordingRef.current = false;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try {
                mediaRecorderRef.current.stop();
            } catch {}
        }
        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch {}
            audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            try {
                mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            } catch {}
            mediaStreamRef.current = null;
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {}
            recognitionRef.current = null;
        }

        setAudioLevel(1.0);

        if (!commitText) {
            // User clicked Cross (✕) - decline and restore initial textarea value
            setValue(initialValueBeforeVoiceRef.current);
            setTimeout(() => adjustHeight(), 50);
        } else {
            // User clicked Tick (✓) - ensure full accumulated transcript is committed into AI chat
            const fullSpoken = [
                accumulatedFinalRef.current,
                currentCycleFinalRef.current,
                interimTranscriptRef.current,
            ].filter(Boolean).join(" ").trim();

            if (fullSpoken) {
                const base = initialValueBeforeVoiceRef.current.trim();
                const merged = base ? `${base}\n${fullSpoken}` : fullSpoken;
                setValue(merged);
            }
            setTimeout(() => {
                adjustHeight();
                textareaRef.current?.focus();
            }, 50);
        }

        setIsVoiceOpen(false);
    }, [adjustHeight, textareaRef]);

    // Keyboard shortcuts for Siri voice overlay (Esc = cancel, Enter = done)
    useEffect(() => {
        if (!isVoiceOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                closeVoiceModal(false);
            } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                closeVoiceModal(true);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isVoiceOpen, closeVoiceModal]);

    // Live sync transcript into textarea value as words are spoken
    const syncTextareaLive = useCallback((spokenText: string) => {
        const base = initialValueBeforeVoiceRef.current.trim();
        const merged = base ? (spokenText ? `${base}\n${spokenText}` : base) : spokenText;
        setValue(merged);
        adjustHeight();
    }, [adjustHeight]);

    // Initialize or restart SpeechRecognition instance
    const initRecognition = (targetLang?: string) => {
        if (!isRecordingRef.current) return;
        try {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {}
                recognitionRef.current = null;
            }

            const SpeechRecognitionConstructor =
                typeof window !== "undefined"
                    ? ((window as unknown as { SpeechRecognition?: new () => ISpeechRecognition }).SpeechRecognition ||
                       (window as unknown as { webkitSpeechRecognition?: new () => ISpeechRecognition }).webkitSpeechRecognition)
                    : null;

            if (!SpeechRecognitionConstructor) {
                setMicError("Live dictation is optimized for Chrome, Edge, and Safari.");
                return;
            }

            const rec = new SpeechRecognitionConstructor();
            recognitionRef.current = rec;
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = targetLang || selectedLanguage || (typeof navigator !== "undefined" && navigator.language) || "en-IN";

            rec.onstart = () => {
                setMicError(null);
                setAudioLevel(1.2);
            };

            rec.onresult = (event: ISpeechRecognitionEvent) => {
                let cycleFinal = "";
                let cycleInterim = "";

                // Iterate through results of current recognition session
                for (let i = 0; i < event.results.length; i++) {
                    const item = event.results[i];
                    if (item.isFinal) {
                        cycleFinal += item[0].transcript + " ";
                    } else {
                        cycleInterim += item[0].transcript;
                    }
                }

                currentCycleFinalRef.current = cycleFinal.trim();
                interimTranscriptRef.current = cycleInterim.trim();

                // Combine past accumulated text with current cycle final text
                const combinedFinal = [accumulatedFinalRef.current, currentCycleFinalRef.current]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                const fullSpoken = [combinedFinal, interimTranscriptRef.current]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                setSpeechTranscript(combinedFinal);
                setInterimTranscript(interimTranscriptRef.current);

                // Stream directly into the AI chat textarea in real time!
                if (fullSpoken) {
                    syncTextareaLive(fullSpoken);
                }

                // Bump wave animation on speech activity
                setAudioLevel((prev) => Math.max(prev, 1.8));
                setTimeout(() => {
                    if (isRecordingRef.current) setAudioLevel(1.1);
                }, 350);
            };

            rec.onerror = (event: ISpeechRecognitionErrorEvent) => {
                console.warn("Speech recognition error:", event.error);
                if (event.error === "no-speech" || event.error === "aborted") return;
                if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                    setMicError("Microphone permission was denied. Please permit mic access in your browser address bar.");
                    return;
                }
                if (event.error === "network") {
                    console.warn("Retrying speech recognition connection with en-US fallback...");
                    if (isRecordingRef.current) {
                        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
                        restartTimerRef.current = setTimeout(() => {
                            if (isRecordingRef.current) initRecognition("en-US");
                        }, 500);
                    }
                    return;
                }
                if (event.error === "language-not-supported") {
                    if (rec.lang !== "en-US") {
                        rec.lang = "en-US";
                        try {
                            rec.start();
                        } catch {}
                    }
                    return;
                }
            };

            rec.onend = () => {
                // Safely commit this cycle's final text into accumulated memory so it's NEVER lost
                if (currentCycleFinalRef.current) {
                    accumulatedFinalRef.current = [accumulatedFinalRef.current, currentCycleFinalRef.current]
                        .filter(Boolean)
                        .join(" ")
                        .trim();
                    currentCycleFinalRef.current = "";
                }

                // Seamless restart on pause/silence so the user can continue speaking naturally
                if (isRecordingRef.current) {
                    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
                    restartTimerRef.current = setTimeout(() => {
                        if (isRecordingRef.current) initRecognition(targetLang);
                    }, 80);
                }
            };

            rec.start();
        } catch (speechErr) {
            console.warn("Speech recognition initialization error:", speechErr);
        }
    };

    // Start Voice Input & SiriWave
    const startVoiceInput = async (lang = selectedLanguage) => {
        setMicError(null);
        setSpeechTranscript("");
        setInterimTranscript("");
        accumulatedFinalRef.current = "";
        currentCycleFinalRef.current = "";
        interimTranscriptRef.current = "";
        initialValueBeforeVoiceRef.current = value;
        setIsVoiceOpen(true);
        isRecordingRef.current = true;
        setVoiceDuration(0);
        setAudioLevel(1.1);

        // Timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setVoiceDuration((prev) => prev + 1);
        }, 1000);

        // Hardware Microphone connection for dynamic SiriWave pulsing & mic permission prompt
        try {
            if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaStreamRef.current = stream;

                // Also initialize MediaRecorder to save audio note
                try {
                    audioChunksRef.current = [];
                    const recorder = new MediaRecorder(stream);
                    mediaRecorderRef.current = recorder;
                    recorder.ondataavailable = (e) => {
                        if (e.data.size > 0) audioChunksRef.current.push(e.data);
                    };
                    recorder.onstop = () => {
                        if (audioChunksRef.current.length > 0) {
                            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                setVoiceNoteUrl(reader.result as string);
                            };
                            reader.readAsDataURL(blob);
                        }
                    };
                    recorder.start(250);
                } catch {}

                const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                if (AudioCtx) {
                    const ctx = new AudioCtx();
                    audioContextRef.current = ctx;
                    const source = ctx.createMediaStreamSource(stream);
                    const analyser = ctx.createAnalyser();
                    analyser.fftSize = 256;
                    analyser.smoothingTimeConstant = 0.5;
                    source.connect(analyser);
                    analyserRef.current = analyser;

                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    const checkAudio = () => {
                        if (!isRecordingRef.current) return;
                        analyser.getByteFrequencyData(dataArray);
                        let sum = 0;
                        for (let i = 0; i < dataArray.length; i++) {
                            sum += dataArray[i];
                        }
                        const avg = sum / dataArray.length;
                        const level = Math.min(3.2, Math.max(1.0, 1.0 + (avg / 28)));
                        setAudioLevel(level);
                        animFrameRef.current = requestAnimationFrame(checkAudio);
                    };
                    animFrameRef.current = requestAnimationFrame(checkAudio);
                }
            }
        } catch (micErr) {
            console.warn("Microphone hardware stream not available, continuing with Web Speech:", micErr);
        }

        // Start speech recognition directly
        initRecognition(lang);
    };



    // Change language while voice modal is open
    const changeLanguage = (newLang: "en-IN" | "hi-IN" | "en-US") => {
        setSelectedLanguage(newLang);
        if (isRecordingRef.current) {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {}
                recognitionRef.current = null;
            }
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            restartTimerRef.current = setTimeout(() => {
                if (isRecordingRef.current) initRecognition(newLang);
            }, 80);
        }
    };

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
                    reporter: reporterPayload,
                    voiceNoteUrl: voiceNoteUrl || undefined,
                }),
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                throw new Error(json.error || "Failed to log concern.");
            }

            // Generate clean reference code
            const ref = `OIL-HSE-${Math.floor(100000 + Math.random() * 900000)}`;
            setReferenceCode(ref);

            const score = json.data?.sif_score ?? json.concernCard?.sif_score ?? 0;
            const autoEscalated = Boolean(json.autoEscalated || score > 75 || json.concernCard?.status === "In Progress");

            setSubmittedInfo({
                sifScore: score,
                isAutoEscalated: autoEscalated,
                hazard: json.data?.hazard || json.concernCard?.hazard,
                hadVoiceNote: Boolean(voiceNoteUrl),
            });

            // Play confirmation chime
            playConfirmationChime();

            setIsSubmitted(true);
            setValue("");
            setVoiceNoteUrl(null);
            setVoiceDuration(0);
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
                        variant={submittedInfo?.isAutoEscalated ? "critical" : "default"}
                        title={
                            submittedInfo?.isAutoEscalated
                                ? "CRITICAL SIF • AUTO-ESCALATED"
                                : "YOUR CONCERN IS RECORDED."
                        }
                        subtitle={
                            submittedInfo?.isAutoEscalated
                                ? `High fatal potential hazard detected (SIF Score: ${submittedInfo.sifScore} > 75). Automatically routed directly to 'In Progress' for immediate intervention.`
                                : "THANKS FOR REPORTING."
                        }
                        metaLabel="Dispatch Routing"
                        metaValue={
                            submittedInfo?.isAutoEscalated
                                ? "⚡ IN PROGRESS (Auto)"
                                : (user?.station || "Moran Rig #04")
                        }
                        observation={lastAnalyzedObservation}
                        officerBadge={user?.badgeId || "OIL-FLD-5542"}
                        officerStation={user?.station || "Moran Rig #04"}
                        hasVoiceNote={submittedInfo?.hadVoiceNote}
                        onReset={() => {
                            setIsSubmitted(false);
                            setValue("");
                            setSubmittedInfo(null);
                            setVoiceNoteUrl(null);
                            setVoiceDuration(0);
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
                            Report Field Safety Concern
                        </h1>
                        <p className="text-sm text-neutral-500 max-w-xl">
                            Log unsafe acts, barrier failures, or speak your observations hands-free. Real-time NLP classifies SIF Precursor density and dispatches to HSE Management.
                        </p>
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
                                    placeholder="Describe an observation, near-miss report, or speak hands-free with mic..."
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

                            {/* Action Bar */}
                            <div className="flex items-center justify-between p-3 border-t border-neutral-100">
                                <div className="flex items-center gap-2">
                                    {/* SiriWave Mic Button */}
                                    <button
                                        type="button"
                                        onClick={() => startVoiceInput()}
                                        className="group px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-800 shadow-2xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                                        title="Speak your concern using Siri Wave Voice AI"
                                    >
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                        <Mic className="w-3.5 h-3.5 text-neutral-700 group-hover:text-red-600 transition-colors" />
                                        <span className="font-semibold text-neutral-700 group-hover:text-neutral-900">
                                            Speak Concern
                                        </span>
                                    </button>

                                    <span className="text-xs text-neutral-400 hidden sm:inline">
                                        Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono text-[10px]">Enter ↵</kbd> to submit
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleAnalyze()}
                                        disabled={!value.trim() || isLoading}
                                        className={cn(
                                            "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
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

                            {/* AI Processing Latency Overlay with LumaSpin */}
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center z-20 space-y-3 p-6 animate-in fade-in duration-200">
                                    <LumaSpin size={46} />
                                    <div className="text-center space-y-1">
                                        <p className="text-xs font-semibold text-neutral-800 tracking-wide">
                                            OIL AI Safety Engine Analyzing Observation...
                                        </p>
                                        <p className="text-[11px] text-neutral-500 max-w-sm">
                                            Evaluating SIF precursor probability, Life-Saving Rules compliance, and priority level.
                                        </p>
                                    </div>
                                </div>
                            )}
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

            {/* Siri Voice Intelligence Minimalist Centered Overlay */}
            {isVoiceOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Voice Concern Assistant"
                    onClick={(e) => {
                        // Clicking backdrop commits spoken text safely
                        if (e.target === e.currentTarget) {
                            closeVoiceModal(true);
                        }
                    }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300 select-none overflow-hidden"
                >
                    {/* Top Language Switcher Bar */}
                    <div className="absolute top-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl shadow-lg">
                        <Globe className="w-3.5 h-3.5 text-neutral-300" />
                        <span className="text-[11px] font-medium text-neutral-300 mr-0.5">Language:</span>
                        {(["en-IN", "en-US", "hi-IN"] as const).map((lang) => (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => changeLanguage(lang)}
                                className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer",
                                    selectedLanguage === lang
                                        ? "bg-white/25 text-white shadow-xs border border-white/30"
                                        : "text-neutral-400 hover:text-white hover:bg-white/10"
                                )}
                            >
                                {lang === "en-IN" ? "English (India) 🇮🇳" : lang === "en-US" ? "English (US) 🌐" : "हिंदी (Hindi) 🇮🇳"}
                            </button>
                        ))}
                    </div>

                    {/* Centered Siri Effect & Controls (No bulky boxes, pure organic glowing interface) */}
                    <div className="relative flex flex-col items-center justify-center w-full max-w-2xl px-6">
                        
                        {/* Radiant Ambient Aura Glow behind the wave */}
                        <div
                            className="absolute -top-4 w-[420px] sm:w-[520px] h-[220px] rounded-full blur-[85px] opacity-75 pointer-events-none transition-transform duration-200"
                            style={{
                                background: "radial-gradient(ellipse at center, rgba(59,130,246,0.45) 0%, rgba(168,85,247,0.4) 40%, rgba(245,158,11,0.25) 75%, transparent 100%)",
                                transform: `scale(${0.9 + (audioLevel - 0.85) * 0.4})`
                            }}
                        />

                        {/* SiriWave Visualizer (Rendered completely transparent in center) */}
                        <div className="relative flex items-center justify-center">
                            <SiriWave
                                variant="wave"
                                width={540}
                                height={240}
                                amplitude={audioLevel}
                                renderScale={1.2}
                                className="filter drop-shadow-[0_0_35px_rgba(59,130,246,0.5)]"
                            />
                        </div>

                        {/* Subtle Floating Real-Time Subtitle */}
                        <div className="min-h-[56px] flex flex-col items-center justify-center text-center px-4 mt-2 max-w-lg">
                            {micError ? (
                                <p className="text-xs sm:text-sm text-amber-300 font-medium bg-amber-950/70 border border-amber-800/80 px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg">
                                    {micError}
                                </p>
                            ) : speechTranscript || interimTranscript ? (
                                <div className="space-y-1">
                                    <p className="text-base sm:text-lg font-medium text-white/95 leading-relaxed tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] line-clamp-2">
                                        &ldquo;{speechTranscript} <span className="text-blue-300/90 italic">{interimTranscript}</span>&rdquo;
                                    </p>
                                    <p className="text-[11px] text-emerald-400 font-medium flex items-center justify-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Writing live to AI chat • Click Done (✓) or press Enter to finish
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-neutral-300/80 font-medium tracking-wide">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                    <span>Listening to your concern... Speak clearly into your microphone</span>
                                    {voiceDuration > 0 && (
                                        <span className="ml-1 text-xs font-mono text-neutral-400">
                                            ({formatDuration(voiceDuration)})
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Two Tactile Controls: Cancel (✕) and Tick (✓) */}
                        <div className="flex items-center justify-center gap-8 sm:gap-10 mt-6">
                            {/* Cancel Button */}
                            <button
                                type="button"
                                onClick={() => closeVoiceModal(false)}
                                className="group relative flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-90"
                                title="Cancel and discard voice recording (Esc)"
                                aria-label="Cancel recording"
                            >
                                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-red-500/20 border border-white/20 hover:border-red-400/50 backdrop-blur-xl text-white shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] transition-all duration-200">
                                    <X className="w-6 h-6 text-neutral-300 group-hover:text-red-400 transition-colors" />
                                </div>
                                <span className="text-[11px] font-semibold text-neutral-400 group-hover:text-red-400 tracking-wider uppercase transition-colors">
                                    Cancel (Esc)
                                </span>
                            </button>

                            {/* Tick Button */}
                            <button
                                type="button"
                                onClick={() => closeVoiceModal(true)}
                                className="group relative flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-90"
                                title="Confirm and save voice concern (Enter)"
                                aria-label="Confirm recording"
                            >
                                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-emerald-500/80 hover:bg-emerald-500 border border-emerald-400/60 backdrop-blur-xl text-white shadow-[0_8px_25px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] transition-all duration-200">
                                    <Check className="w-6 h-6 text-white stroke-[2.5] group-hover:scale-110 transition-transform" />
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-400 group-hover:text-emerald-300 tracking-wider uppercase transition-colors">
                                    Done (Enter)
                                </span>
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
