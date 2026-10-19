"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { CallProvider } from "@/components/call/call-provider";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { LiveProvider } from "@/components/live-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login/");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-svh place-items-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <LiveProvider>
      <CallProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </CallProvider>
    </LiveProvider>
  );
}
