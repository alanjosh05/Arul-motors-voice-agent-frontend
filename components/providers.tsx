"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QUERY_CACHE_KEY } from "@/lib/session";

const CACHE_MAX_AGE = 12 * 60 * 60 * 1000; // as long as a sign-in lasts

export function Providers({ children }: { children: React.ReactNode }) {
  // The sign-in page is always light; the CRM follows the chosen theme.
  const forcedTheme = usePathname()?.startsWith("/login") ? "light" : undefined;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Data shows straight away from the cache (kept across reloads, below)
          // and refreshes in the background; live events refresh it on change.
          queries: { staleTime: 30_000, gcTime: CACHE_MAX_AGE, refetchOnWindowFocus: true, retry: 1 },
        },
      }),
  );
  // Stale-while-revalidate across reloads: the last data is kept in this
  // browser (up to 12 h, removed at sign-out, dropped by each new build) so a
  // page opens with it instantly and refreshes behind the scenes.
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: typeof window === "undefined" ? undefined : window.localStorage,
      key: QUERY_CACHE_KEY,
      throttleTime: 2000,
    }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem forcedTheme={forcedTheme} disableTransitionOnChange>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: CACHE_MAX_AGE,
          buster: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev",
          dehydrateOptions: {
            // Only finished, successful lists; live status is always fetched fresh.
            shouldDehydrateQuery: (q) => q.state.status === "success" && q.queryKey[0] !== "voice-status",
          },
        }}
      >
        <AuthProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}
