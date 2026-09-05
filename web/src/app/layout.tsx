import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AtlasOps — Infrastructure Monitoring",
  description:
    "DevOps monitoring platform: FastAPI + PostgreSQL + Redis + Nginx + Prometheus + Grafana. Junior DevOps portfolio project.",
  keywords: [
    "DevOps",
    "Monitoring",
    "FastAPI",
    "Prometheus",
    "Grafana",
    "Docker",
    "Infrastructure",
  ],
  authors: [{ name: "AtlasOps" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AtlasOps — Infrastructure Monitoring",
    description: "DevOps monitoring platform: live dashboard, runbook, architecture explorer.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AtlasOps — Infrastructure Monitoring",
    description: "DevOps monitoring platform for a junior DevOps portfolio.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
