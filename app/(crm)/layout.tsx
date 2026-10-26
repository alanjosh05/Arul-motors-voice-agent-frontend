"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { CallProvider } from "@/components/call/call-provider";
import { IdleLogout } from "@/components/idle-logout";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { LiveProvider } from "@/components/live-provider";
import { ShiftGate } from "@/components/shift-gate";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { prefetchAllPages } from "@/lib/queries";
import { AnimateIn } from "@/components/motion/animate-in";
import { ActionLoader } from "@/components/action-loader";
import { BikeLoader } from "@/components/bike-loader";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const queryClient = useQueryClient();

  useEffect(() => {
    if (ready && !user) router.replace("/login/");
  }, [ready, user, router]);

  // Once signed in, load every page's data in the background (when the
  // browser is idle), so moving around the CRM shows data straight away.
  useEffect(() => {
    if (!user) return;
    const warm = () => prefetchAllPages(queryClient);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(warm, 500);
    return () => clearTimeout(t);
  }, [user, queryClient]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-svh place-items-center">
        <BikeLoader className="w-56 sm:w-72" />
      </div>
    );
  }

  return (
    // Outside working hours nothing below loads for staff (no data, no live feed).
    <ShiftGate>
    <LiveProvider>
      <CallProvider>
        <IdleLogout />
        <ActionLoader />
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
              {/* Each page animates in when opened (keyed by route). */}
              <AnimateIn key={pathname} preset="page" className="contents">
                {children}
              </AnimateIn>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </CallProvider>
    </LiveProvider>
    </ShiftGate>
  );
}
