"use client";

/**
 * InversionCircleScrollAnimation
 *
 * Scroll-driven animation merged from:
 *   +page.svelte                  → hero circle animation
 *   ContentSection.svelte         → scroll-reveal section
 *   Button.svelte                 → CTA button
 */

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { Auth, type UserSessionData } from "@/components/ui/auth-form-1";
import { VercelV0Chat } from "@/components/ui/v0-ai-chat";
import { Sidenavbar } from "@/components/ui/sidenavbar";
import { KanbanBoard } from "@/components/ui/kanban-board";
import { BentoDashboard } from "@/components/ui/bento-dashboard";
import { UserManagementPortal } from "@/components/ui/user-management-portal";
import { OfficerConcernHistory } from "@/components/ui/officer-concern-history";

// ─── constants ────────────────────────────────────────────────────────────────
const BALL_SIZE = 380; // px — fixed diameter during Phase 1 travel

// ─── root export ──────────────────────────────────────────────────────────────
export default function InversionCircleScrollAnimation() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [userSession, setUserSession] = useState<UserSessionData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("oil_user_session");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [managerTab, setManagerTab] = useState<string>("Home");
  const [workerTab, setWorkerTab] = useState<string>("Home");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthOpen && !userSession) setIsAuthOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthOpen, userSession]);

  const handleLoginSuccess = (user: UserSessionData) => {
    setUserSession(user);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("oil_user_session", JSON.stringify(user));
      } catch {}
    }
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    setUserSession(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("oil_user_session");
      } catch {}
    }
    setManagerTab("Home");
    setWorkerTab("Home");
  };

  const handleUpdateUser = (updated: UserSessionData) => {
    setUserSession(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("oil_user_session", JSON.stringify(updated));
      } catch {}
    }
  };

  // If logged in as Worker
  if (userSession?.role === "worker") {
    return (
      <div className="h-screen bg-neutral-50 text-neutral-900 flex overflow-hidden">
        <Sidenavbar
          user={userSession}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
          activeItem={workerTab}
          onSelect={(tab) => setWorkerTab(tab)}
        >
          <div className="relative flex-1 flex flex-col items-center justify-center h-full w-full overflow-hidden">
            {workerTab === "History" ? (
              <OfficerConcernHistory
                user={userSession}
                onLogNewConcern={() => setWorkerTab("Home")}
              />
            ) : (
              <VercelV0Chat
                user={userSession}
                onViewHistory={() => setWorkerTab("History")}
              />
            )}
          </div>
        </Sidenavbar>
      </div>
    );
  }

  // If logged in as Manager
  if (userSession?.role === "manager") {
    return (
      <div className="h-screen bg-neutral-50 text-neutral-900 flex overflow-hidden">
        <Sidenavbar
          user={userSession}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
          activeItem={managerTab}
          onSelect={(tab) => setManagerTab(tab)}
        >
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {managerTab === "Analytics" ? (
              <BentoDashboard />
            ) : managerTab === "Users" ? (
              <UserManagementPortal currentManager={userSession} />
            ) : (
              <KanbanBoard user={userSession} />
            )}
          </div>
        </Sidenavbar>
      </div>
    );
  }

  return (
    <>
      <Styles />
      <div ref={wrapperRef} className="icsa-wrap">
        <HeroSection wrapperRef={wrapperRef} />
        <ContentSection
          wrapperRef={wrapperRef}
          onGetStarted={() => setIsAuthOpen(true)}
        />
      </div>

      {/* Full Screen Auth View */}
      <AnimatePresence>
        {isAuthOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col justify-center items-center bg-white text-zinc-950 overflow-y-auto p-4 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-6 right-6 z-20 flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="w-full max-w-xl my-auto py-8">
              <Auth onLoginSuccess={handleLoginSuccess} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── HeroSection ──────────────────────────────────────────────────────────────
type WRef = React.RefObject<HTMLDivElement | null>;

function HeroSection({ wrapperRef }: { wrapperRef: WRef }) {
  const [scrollY, setScrollY] = useState(0);
  const [viewH,   setViewH]   = useState(600);
  const [viewW,   setViewW]   = useState(800);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const measure = () => { setViewH(el.clientHeight); setViewW(el.clientWidth); };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const onScroll = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => { ro.disconnect(); el.removeEventListener("scroll", onScroll); };
  }, [wrapperRef]);

  // phase progress 0 → 1
  const p1 = clamp(scrollY / viewH);
  const p2 = clamp((scrollY - viewH) / viewH);

  // Power4 InOut
  const p1e = p1 < 0.5 ? 8 * p1 ** 4 : 1 - (-2 * p1 + 2) ** 4 / 2;
  // ease-in²
  const p2e = p2 * p2;

  // geometry
  const yOff      = (1 - p1e) * (viewH / 2 + BALL_SIZE / 2);
  const coverSize = Math.max(viewW, viewH) * 2.8;
  const ballSize  = BALL_SIZE + p2e * (coverSize - BALL_SIZE);
  const clipX     = viewW / 2;
  const clipY     = viewH / 2 + yOff;
  const clipR     = ballSize / 2;

  return (
    <div className="icsa-track">
      <section className="icsa-hero">
        {/* expanding black circle */}
        <div
          className="icsa-ball"
          style={{
            width:     ballSize,
            height:    ballSize,
            transform: `translate(-50%, calc(-50% + ${yOff}px))`,
          }}
        />

        {/* black text — always visible */}
        <div className="icsa-layer icsa-dark">
          <h1 suppressHydrationWarning>Zero Fatalities.</h1>
          <p suppressHydrationWarning>AI-driven SIF precursor density & Life-Saving Rules intelligence.</p>
        </div>

        {/* white text — clipped to the circle (inversion) */}
        <div
          className="icsa-layer icsa-light"
          style={{ clipPath: `circle(${clipR}px at ${clipX}px ${clipY}px)` }}
        >
          <h1 suppressHydrationWarning>Zero Fatalities.</h1>
          <p suppressHydrationWarning>AI-driven SIF precursor density & Life-Saving Rules intelligence.</p>
        </div>
      </section>
    </div>
  );
}

// ─── ContentSection ───────────────────────────────────────────────────────────
function ContentSection({
  wrapperRef,
  onGetStarted,
}: {
  wrapperRef: WRef;
  onGetStarted: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el   = ref.current;
    const root = wrapperRef.current;
    if (!el || !root) return;

    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setOn(true); },
      { root, threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wrapperRef]);

  return (
    <section ref={ref} className={`icsa-cs${on ? " on" : ""}`}>
      <div className="icsa-inner">
        <span className="icsa-label">Safety Intelligence</span>
        <h2>Target SIF Precursors.<br />Enforce Life-Saving Rules.</h2>
        <p>
          Rank OIL sites by fatal potential density and auto-map field observations
          to Life-Saving Rules to prioritize safety interventions.
        </p>
        <CTAButton onClick={onGetStarted} />
      </div>
    </section>
  );
}

// ─── Button (from Button.svelte) ──────────────────────────────────────────────
function CTAButton({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} type="button" className="icsa-btn">
      Get started
    </button>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const clamp = (v: number) => Math.min(1, Math.max(0, v));

// ─── styles ───────────────────────────────────────────────────────────────────
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&display=swap');

      .icsa-wrap *, .icsa-wrap *::before, .icsa-wrap *::after {
        box-sizing: border-box; margin: 0; padding: 0;
      }

      .icsa-wrap {
        width: 100%; height: 100vh;
        overflow-y: scroll; overflow-x: clip;
        font-family: Inter, sans-serif;
        background: #fff;
      }

      .icsa-track { height: 300vh; position: relative; }

      .icsa-hero {
        position: sticky; top: 0;
        height: 100vh; overflow: hidden;
      }

      .icsa-ball {
        position: absolute; top: 50%; left: 50%;
        border-radius: 50%; background: #000;
        will-change: transform, width, height;
      }

      .icsa-layer {
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center; padding: 0 2rem;
        pointer-events: none;
      }
      .icsa-dark  { color: #000; z-index: 2; }
      .icsa-light { color: #fff; z-index: 3; will-change: clip-path; }

      .icsa-layer h1 {
        font-size: clamp(2.5rem, 7vw, 6rem);
        font-weight: 900; letter-spacing: -0.03em; line-height: 1.05;
      }
      .icsa-layer p {
        font-size: clamp(1rem, 2.5vw, 1.5rem);
        font-weight: 400; margin-top: 1.25rem; opacity: .7;
      }

      .icsa-cs {
        min-height: 100vh;
        display: flex; align-items: center; justify-content: center;
        padding: 6rem 2rem;
        background: #000; color: #fff;
        transition: background 2.4s cubic-bezier(.25,0,.1,1),
                    color      2.4s cubic-bezier(.25,0,.1,1);
      }
      .icsa-cs.on { background: #fff; color: #000; }

      .icsa-inner {
        max-width: 720px; text-align: center;
        display: flex; flex-direction: column;
        align-items: center; gap: 1.75rem;
      }

      .icsa-inner > * {
        opacity: 0; transform: translateY(24px);
        transition: opacity .7s ease, transform .7s ease;
      }
      .icsa-cs.on .icsa-inner > * { opacity: 1; transform: translateY(0); }

      .icsa-cs.on .icsa-label { transition-delay: .10s; }
      .icsa-cs.on h2          { transition-delay: .24s; }
      .icsa-cs.on p           { transition-delay: .38s; }
      .icsa-cs.on .icsa-btn   { transition-delay: .52s; }

      .icsa-label {
        font-size: .75rem; font-weight: 600;
        letter-spacing: .18em; text-transform: uppercase; opacity: .45;
      }
      .icsa-inner h2 {
        font-size: clamp(2rem, 6vw, 4rem);
        font-weight: 900; letter-spacing: -.03em; line-height: 1.08;
      }
      .icsa-inner p {
        font-size: clamp(1rem, 2vw, 1.2rem);
        line-height: 1.75; opacity: .6; max-width: 560px;
      }

      .icsa-btn {
        background: #ff3e00; color: #fff;
        padding: 10px 28px; border-radius: 8px; border: none;
        cursor: pointer; font-family: Inter, sans-serif;
        font-size: 1rem; font-weight: 600; letter-spacing: .01em;
        transition: opacity .2s ease, transform .2s ease;
      }
      .icsa-btn:hover  { opacity: .85; transform: translateY(-1px); }
      .icsa-btn:active { opacity: 1;   transform: translateY(0);    }
    `}</style>
  );
}
