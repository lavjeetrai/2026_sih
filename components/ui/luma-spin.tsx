"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LumaSpinProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional size in pixels (default is 65px) */
  size?: number;
}

export const Component = ({ className, size, style, ...props }: LumaSpinProps) => {
  const scale = size ? size / 65 : undefined;

  return (
    <div
      className={cn("relative w-[65px] aspect-square shrink-0", className)}
      style={{
        ...(scale ? { transform: `scale(${scale})`, transformOrigin: "center center" } : {}),
        ...style,
      }}
      {...props}
    >
      <span className="absolute rounded-[50px] animate-loaderAnim shadow-[inset_0_0_0_3px] shadow-gray-800 dark:shadow-gray-100" />
      <span className="absolute rounded-[50px] animate-loaderAnim animation-delay shadow-[inset_0_0_0_3px] shadow-gray-800 dark:shadow-gray-100" />
      <style>{`
        @keyframes loaderAnim {
          0% {
            inset: 0 35px 35px 0;
          }
          12.5% {
            inset: 0 35px 0 0;
          }
          25% {
            inset: 35px 35px 0 0;
          }
          37.5% {
            inset: 35px 0 0 0;
          }
          50% {
            inset: 35px 0 0 35px;
          }
          62.5% {
            inset: 0 0 0 35px;
          }
          75% {
            inset: 0 0 35px 35px;
          }
          87.5% {
            inset: 0 0 35px 0;
          }
          100% {
            inset: 0 35px 35px 0;
          }
        }
        .animate-loaderAnim {
          animation: loaderAnim 2.5s infinite;
        }
        .animation-delay {
          animation-delay: -1.25s;
        }
      `}</style>
    </div>
  );
};

export const LumaSpin = Component;
export default Component;
