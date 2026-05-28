import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

// Display font (headings) — matches the GoToStudio brand.
const hand = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoToSEO — AI SEO Toolkit",
  description: "AI-powered SEO audits, fixes & content. Part of the GoToStudio family.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${hand.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased bg-paper text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
