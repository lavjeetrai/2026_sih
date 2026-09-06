"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface OilSihLogoProps {
  size?: "xs" | "sm" | "md" | "lg";
  compact?: boolean;
  showSubText?: boolean;
  inverted?: boolean;
  className?: string;
  onClick?: () => void;
}

export function OilSihLogo({
  size = "md",
  compact = false,
  showSubText = true,
  inverted = false,
  className,
  onClick,
}: OilSihLogoProps) {
  // Dimension tokens based on size
  const config = {
    xs: {
      svgSize: 22,
      oilTitle: "text-[10px] leading-tight font-extrabold tracking-tight",
      oilSub: "text-[6.5px] leading-none text-neutral-400 font-medium",
      xSize: "text-[13px] font-bold mx-0.5",
      imgHeight: "h-5 w-auto max-w-[24px]",
      sihTop: "text-[8px] leading-tight font-black tracking-tight",
      sihBottom: "text-[7px] leading-tight font-extrabold tracking-wider",
      gap: "gap-1.5",
      innerGap: "gap-1",
    },
    sm: {
      svgSize: 28,
      oilTitle: "text-[12px] leading-tight font-extrabold tracking-tight",
      oilSub: "text-[7.5px] leading-none text-neutral-500 font-medium mt-0.5",
      xSize: "text-base font-bold mx-1",
      imgHeight: "h-7 w-auto max-w-[32px]",
      sihTop: "text-[9.5px] leading-tight font-black tracking-tight",
      sihBottom: "text-[8px] leading-tight font-extrabold tracking-wider",
      gap: "gap-2",
      innerGap: "gap-1.5",
    },
    md: {
      svgSize: 40,
      oilTitle: "text-lg leading-tight font-black tracking-tight",
      oilSub: "text-[11px] leading-tight text-neutral-500 font-medium mt-0.5",
      xSize: "text-2xl font-bold mx-1.5",
      imgHeight: "h-10 w-auto max-w-[48px]",
      sihTop: "text-[13.5px] leading-tight font-black tracking-tight",
      sihBottom: "text-[11.5px] leading-tight font-extrabold tracking-wider",
      gap: "gap-3.5",
      innerGap: "gap-2.5",
    },
    lg: {
      svgSize: 50,
      oilTitle: "text-xl sm:text-2xl leading-tight font-black tracking-tight",
      oilSub: "text-xs leading-tight text-neutral-500 font-medium mt-0.5",
      xSize: "text-3xl font-bold mx-2",
      imgHeight: "h-12 w-auto max-w-[56px]",
      sihTop: "text-base leading-tight font-black tracking-tight",
      sihBottom: "text-xs sm:text-sm leading-tight font-extrabold tracking-wider",
      gap: "gap-4",
      innerGap: "gap-3",
    },
  }[size];

  // If in compact mode (e.g. collapsed sidebar)
  if (compact) {
    return (
      <div
        className={cn("inline-flex items-center justify-center relative cursor-pointer", className)}
        onClick={onClick}
        title="OIL India Limited • Smart India Hackathon"
      >
        <svg
          width={config.svgSize}
          height={config.svgSize}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 drop-shadow-xs"
        >
          <circle cx="32" cy="32" r="30" stroke="#E52B20" strokeWidth="4" fill="#ffffff" />
          <path
            d="M32 10C32 10 23 23 23 30C23 35 27 39 32 39C37 39 41 35 41 30C41 23 32 10 32 10Z"
            fill="#E52B20"
          />
          <path
            d="M32 21C32 21 27 27 27 31C27 33.8 29.2 36 32 36C34.8 36 37 33.8 37 31C37 27 32 21 32 21Z"
            fill="#ffffff"
          />
          <path
            d="M20 43H44V47C44 48.1 43.1 49 42 49H22C20.9 49 20 48.1 20 47V43Z"
            fill="#1F2937"
          />
          <rect x="24" y="51" width="16" height="3" rx="1.5" fill="#E52B20" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center select-none flex-nowrap",
        config.gap,
        className
      )}
      onClick={onClick}
    >
      {/* 1. Oil India Limited Brand Block */}
      <div className={cn("flex items-center shrink-0", config.innerGap)}>
        <svg
          width={config.svgSize}
          height={config.svgSize}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <circle cx="32" cy="32" r="30" stroke="#E52B20" strokeWidth="4" fill="#ffffff" />
          <path
            d="M32 10C32 10 23 23 23 30C23 35 27 39 32 39C37 39 41 35 41 30C41 23 32 10 32 10Z"
            fill="#E52B20"
          />
          <path
            d="M32 21C32 21 27 27 27 31C27 33.8 29.2 36 32 36C34.8 36 37 33.8 37 31C37 27 32 21 32 21Z"
            fill="#ffffff"
          />
          <path
            d="M20 43H44V47C44 48.1 43.1 49 42 49H22C20.9 49 20 48.1 20 47V43Z"
            fill="#1F2937"
          />
          <rect x="24" y="51" width="16" height="3" rx="1.5" fill="#E52B20" />
        </svg>

        <div className="flex flex-col justify-center">
          <span
            className={cn(
              config.oilTitle,
              inverted ? "text-white" : "text-[#1F2937]"
            )}
          >
            OIL INDIA LIMITED
          </span>
          {showSubText && size !== "xs" && (
            <span
              className={cn(
                config.oilSub,
                inverted ? "text-neutral-300" : "text-[#6B7280]"
              )}
            >
              Conquering Newer Horizons
            </span>
          )}
        </div>
      </div>

      {/* 2. Cursive letter X */}
      <span
        style={{
          fontFamily: "'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive",
        }}
        className={cn(
          "italic shrink-0 inline-flex items-center select-none",
          config.xSize,
          inverted ? "text-neutral-300" : "text-[#64748B]"
        )}
      >
        X
      </span>

      {/* 3. Partner Image + SMART INDIA HACKATHON non-cursive text */}
      <div className={cn("flex items-center shrink-0", config.innerGap)}>
        <img
          src="/image.png"
          alt="Smart India Hackathon"
          className={cn("object-contain shrink-0", config.imgHeight)}
        />
        <div className="flex flex-col justify-center">
          <span
            className={cn(
              config.sihTop,
              inverted ? "text-white" : "text-[#1F2937]"
            )}
          >
            SMART INDIA
          </span>
          <span className={cn("text-[#E52B20]", config.sihBottom)}>
            HACKATHON
          </span>
        </div>
      </div>
    </div>
  );
}

export default OilSihLogo;
