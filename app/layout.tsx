import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppSessionProvider } from "@/components/providers/session-provider";
import { TelemetryProvider } from "@/components/providers/telemetry-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JODO",
  description: "Automate your business without technical knowledge",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <TelemetryProvider>
          <AppSessionProvider>{children}</AppSessionProvider>
        </TelemetryProvider>
      </body>
    </html>
  );
}
