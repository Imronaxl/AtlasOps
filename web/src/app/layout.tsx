import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtlasOps",
  description: "Infrastructure monitoring: service health, metrics, alerts and runbooks.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
