import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { applicationOrigin } from "@/lib/auth/origin";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(applicationOrigin()),
  title: {
    default: "Squad Planner – Cricket Auction & Team Management",
    template: "%s | Squad Planner",
  },
  description: "Plan cricket auctions, manage squads, organise fixtures, track player opportunities and coordinate tournament duties.",
  applicationName: "Squad Planner",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "en_GB", url: "/", siteName: "Squad Planner", title: "Squad Planner – Cricket Auction & Team Management", description: "Plan cricket auctions, manage squads, organise fixtures, track player opportunities and coordinate tournament duties." },
  twitter: { card: "summary", title: "Squad Planner – Cricket Auction & Team Management", description: "Plan cricket auctions, manage squads and organise cricket tournaments." },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
