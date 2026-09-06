"use client";

import dynamic from "next/dynamic";

const Demo = dynamic(() => import("@/demo"), { ssr: false });

export default function Home() {
  return (
    <main className="w-full min-h-screen">
      <Demo />
    </main>
  );
}
