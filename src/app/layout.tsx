import type { Metadata } from "next";
import { Fredericka_the_Great, Inter, Special_Elite } from "next/font/google";
import "./globals.css";

const hand = Fredericka_the_Great({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SEO Engine — AI SEO Toolkit",
  description: "Free AI-powered SEO audit & fix tool. Built for indie SEO.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${hand.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
