import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { preconnect } from "react-dom";
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
  // Open the connection to the API (DNS + TLS, ~170 ms from India) while the
  // page loads, so the first data request doesn't wait for it.
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (api) preconnect(api, { crossOrigin: "anonymous" });
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans antialiased", geist.variable, geistMono.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
