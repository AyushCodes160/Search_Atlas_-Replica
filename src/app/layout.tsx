import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
