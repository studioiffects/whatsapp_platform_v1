import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { ReactNode } from "react";
import { AppProviders } from "@/components/layout/app-providers";
import "@/styles/globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "WhatsApp Multiagent Console",
  description: "Plataforma multiagente con dashboard, chat y control operativo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${headingFont.variable} ${monoFont.variable}`}>
      <body style={{ fontFamily: "var(--font-heading), sans-serif" }}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
