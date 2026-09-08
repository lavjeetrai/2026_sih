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
import { OilSihLogo } from "@/components/ui/oil-sih-logo";
import { FixLedgerPortal } from "@/components/ui/fix-ledger-portal";

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
      <div className="h-screen bg-neutral-50 text-neutral-900 flex flex-col overflow-hidden">
        {/* Fixed Top Header: Logo comfortably spaced down and fully visible */}
        <header className="h-[72px] px-6 sm:px-8 border-b border-neutral-200 bg-white shrink-0 z-30 flex items-center shadow-2xs">
          <HeaderCollaborationLogo />
        </header>

        <div className="flex-1 flex overflow-hidden">
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
              ) : workerTab === "FixLedger" ? (
                <FixLedgerPortal user={userSession} />
              ) : (
                <VercelV0Chat
                  user={userSession}
                  onViewHistory={() => setWorkerTab("History")}
                />
              )}
            </div>
          </Sidenavbar>
        </div>
      </div>
    );
  }

  // If logged in as Manager
  if (userSession?.role === "manager") {
    return (
      <div className="h-screen bg-neutral-50 text-neutral-900 flex flex-col overflow-hidden">
        {/* Fixed Top Header: Logo comfortably spaced down and fully visible */}
        <header className="h-[72px] px-6 sm:px-8 border-b border-neutral-200 bg-white shrink-0 z-30 flex items-center shadow-2xs">
          <HeaderCollaborationLogo />
        </header>

        <div className="flex-1 flex overflow-hidden">
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
              ) : managerTab === "FixLedger" ? (
                <FixLedgerPortal user={userSession} />
              ) : (
                <KanbanBoard user={userSession} />
              )}
            </div>
          </Sidenavbar>
        </div>
      </div>
    );
  }

  const handleScrollToPageTwo = () => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollTo({
        top: window.innerHeight - 68,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      <Styles />

      {/* Global Persistent Fixed Header: ALWAYS visible at top-left on Page 1 & Page 2 */}
      <header className="oil-main-nav fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <HeaderCollaborationLogo />

        <div className="oil-nav-right">
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="oil-portal-btn"
          >
            <span>HSE Portal Login</span>
            <span>→</span>
          </button>
        </div>
      </header>

      <div ref={wrapperRef} className="icsa-wrap pt-[68px]">
        {/* Page 1: Oil India Limited Official Banner & Stats Layout matching screenshot */}
        <OilIndiaHomePage
          onGetStarted={() => setIsAuthOpen(true)}
          onScrollToPageTwo={handleScrollToPageTwo}
        />

        {/* Page 2: Safety Intelligence Section ("what we used to get") */}
        <ContentSection
          wrapperRef={wrapperRef}
          onGetStarted={() => setIsAuthOpen(true)}
        />

        {/* Floating scroll to top button */}
        <button
          type="button"
          onClick={() => wrapperRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-4 right-4 z-30 w-8 h-8 rounded-full bg-[#E52B20] text-white flex items-center justify-center shadow-lg hover:bg-[#c91f15] transition-all text-sm font-bold"
          aria-label="Scroll to top"
        >
          ↑
        </button>
      </div>

      {/* Full Screen Auth View */}
      <AnimatePresence>
        {isAuthOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex flex-col justify-between bg-white text-zinc-950 overflow-y-auto"
          >
            {/* Top Bar with Logos in top-left */}
            <header className="oil-main-nav border-b border-gray-100 bg-white sticky top-0 z-20">
              <HeaderCollaborationLogo />

              <button
                type="button"
                onClick={() => setIsAuthOpen(false)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 border border-zinc-200 transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Home</span>
              </button>
            </header>

            <div className="w-full max-w-xl mx-auto my-auto p-4 sm:p-8 py-8">
              <Auth onLoginSuccess={handleLoginSuccess} />
            </div>

            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Header Collaboration Logo ───────────────────────────────────────────────
function HeaderCollaborationLogo() {
  return <OilSihLogo size="md" />;
}

const STRIP_ITEMS = [
  { value: "0", label: "Fatalities • Zero Target" },
  { value: "9", label: "IOGP Life-Saving Rules" },
  { value: "100%", label: "SIF Precursor Coverage" },
  { value: "24/7", label: "AI Hazard Monitoring" },
  { value: "OIL", label: "Operational Safety Assets" },
];

function OilIndiaHomePage({
  onGetStarted,
  onScrollToPageTwo,
}: {
  onGetStarted: () => void;
  onScrollToPageTwo: () => void;
}) {
  return (
    <div className="oil-first-page">
      {/* Center: Video Banner */}
      <div className="oil-video-banner">
        <video
          src="/front.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="oil-video-element"
        />

        {/* Clickable hotspot over the video's 'Know More' button area to scroll to Page 2 */}
        <button
          type="button"
          onClick={onScrollToPageTwo}
          aria-label="Know More - Scroll to safety overview"
          className="oil-know-more-hotspot"
          title="Click to view Safety Intelligence"
        />

        {/* Floating right social toolbar matching screenshot */}
        <div className="oil-social-sidebar">
          <div className="oil-social-dot oil-social-red">OIL</div>
          <div className="oil-social-dot">f</div>
          <div className="oil-social-dot">▶</div>
          <div className="oil-social-dot">in</div>
        </div>
      </div>

      {/* Bottom: Black Strap */}
      <div className="oil-stats-strip">
        <div className="oil-stats-grid">
          {STRIP_ITEMS.map((item, idx) => (
            <div key={idx} className="oil-stat-item">
              <span className="oil-stat-number">{item.value}</span>
              <span className="oil-stat-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page 2: ContentSection ("what we used to get") ───────────────────────────
type WRef = React.RefObject<HTMLDivElement | null>;

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
    const el = ref.current;
    const root = wrapperRef.current;
    if (!el || !root) return;

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setOn(true);
      },
      { root, threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wrapperRef]);

  return (
    <section id="safety-overview" ref={ref} className={`icsa-cs${on ? " on" : ""}`}>
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

// ─── styles ───────────────────────────────────────────────────────────────────
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;500;600;700;800;900&display=swap');

      .icsa-wrap *, .icsa-wrap *::before, .icsa-wrap *::after {
        box-sizing: border-box; margin: 0; padding: 0;
      }

      .icsa-wrap {
        width: 100%;
        height: 100vh;
        overflow-y: auto;
        overflow-x: hidden;
        scroll-behavior: smooth;
        font-family: Inter, sans-serif;
        background: #000;
        color: #fff;
      }

      /* ─── Page 1: Oil India Banner & Layout ─── */
      .oil-first-page {
        width: 100%;
        height: calc(100vh - 68px);
        min-height: calc(100vh - 68px);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #ffffff;
        color: #1f2937;
        overflow: hidden;
        position: relative;
      }

      .oil-main-nav {
        height: 68px;
        background: #ffffff;
        border-bottom: 1px solid #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1.5rem;
        flex-shrink: 0;
        z-index: 50;
      }
      @media (min-width: 1024px) {
        .oil-main-nav { padding: 0 2.5rem; }
      }

      .oil-logo-wrap {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .oil-brand-block {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .oil-collab-x {
        font-family: 'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive;
        font-size: 1.65rem;
        font-weight: 700;
        font-style: italic;
        color: #64748b;
        margin: 0 0.25rem;
        line-height: 1;
        user-select: none;
        display: inline-flex;
        align-items: center;
      }

      .oil-collab-partner {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .oil-collab-img {
        height: 40px;
        width: auto;
        max-width: 48px;
        object-fit: contain;
        display: block;
      }

      .oil-sih-text {
        display: flex;
        flex-direction: column;
        line-height: 1.05;
        justify-content: center;
      }

      .oil-sih-top {
        font-family: Inter, sans-serif;
        font-size: 0.85rem;
        font-weight: 900;
        color: #1f2937;
        letter-spacing: 0.05em;
        line-height: 1.1;
      }

      .oil-sih-bottom {
        font-family: Inter, sans-serif;
        font-size: 0.72rem;
        font-weight: 800;
        color: #E52B20;
        letter-spacing: 0.12em;
        line-height: 1.1;
      }

      .oil-logo-svg {
        width: 42px;
        height: 42px;
        flex-shrink: 0;
      }

      .oil-logo-text {
        display: flex;
        flex-direction: column;
      }

      .oil-title {
        font-size: 1.15rem;
        font-weight: 900;
        letter-spacing: -0.02em;
        color: #1f2937;
        line-height: 1.1;
      }

      .oil-sub {
        font-size: 0.68rem;
        font-weight: 500;
        color: #6b7280;
        margin-top: 1px;
        letter-spacing: 0.02em;
      }

      .oil-nav-right {
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }


      .oil-portal-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: #E52B20;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 6px rgba(229, 43, 32, 0.25);
      }
      .oil-portal-btn:hover {
        background: #c91f15;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(229, 43, 32, 0.35);
      }

      .oil-video-banner {
        flex: 1;
        position: relative;
        width: 100%;
        min-height: 0;
        background: #000;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .oil-video-element {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
      }

      .oil-know-more-hotspot {
        position: absolute;
        bottom: 10%;
        left: 8%;
        width: 130px;
        height: 42px;
        background: transparent;
        border: none;
        cursor: pointer;
        border-radius: 9999px;
        z-index: 10;
        transition: background 0.2s ease;
      }
      .oil-know-more-hotspot:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .oil-social-sidebar {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        display: none;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 15;
      }
      @media (min-width: 640px) {
        .oil-social-sidebar { display: flex; }
      }

      .oil-social-dot {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #ffffff;
        color: #4b5563;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .oil-social-dot:hover {
        transform: scale(1.1);
      }
      .oil-social-red {
        background: #E52B20;
        color: #ffffff;
        font-size: 9px;
      }

      .oil-stats-strip {
        background: #0b0c0e;
        border-top: 1px solid #1f2328;
        padding: 0.85rem 1rem;
        flex-shrink: 0;
        z-index: 20;
      }

      .oil-stats-grid {
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
      }
      @media (min-width: 768px) {
        .oil-stats-grid {
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 0;
        }
      }

      .oil-stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 0.25rem 0.5rem;
      }
      @media (min-width: 768px) {
        .oil-stat-item:not(:last-child) {
          border-right: 1px solid #23272f;
        }
      }

      .oil-stat-number {
        color: #E52B20;
        font-size: clamp(1.4rem, 2.2vw, 2.1rem);
        font-weight: 900;
        line-height: 1;
        letter-spacing: -0.02em;
      }

      .oil-stat-label {
        color: #f3f4f6;
        font-size: clamp(0.68rem, 0.9vw, 0.8rem);
        font-weight: 400;
        margin-top: 0.35rem;
        opacity: 0.9;
        line-height: 1.2;
      }

      /* ─── Page 2 (What we used to get: ContentSection) ─── */
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
