import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OIL India HSE | SIF-Precursor Analytics & Life-Saving Rules",
  description:
    "Oil India Limited (OIL) AI/NLP Safety Platform - Ranking sites and activities by SIF-precursor density and auto-mapping to Life-Saving Rules (LSR) for prioritized fatal potential interventions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
