import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "Arul Motors CRM", template: "%s · Arul Motors CRM" },
  description: "Service follow-ups, bookings and the AI voice agent for Arul Motors Yamaha, Nazareth.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans antialiased", geist.variable, geistMono.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
