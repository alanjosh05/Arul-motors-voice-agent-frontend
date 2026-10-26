"use client";

import { CalendarPlus, Check, Monitor, Moon, Motorbike, Plus, Sun, UserPlus } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calculator } from "@/components/layout/calculator";
import { CommandMenu } from "@/components/layout/command-menu";
import { ActiveCallsPill, LiveStatus, NotificationsBell } from "@/components/live/live-indicators";
import { navTitle } from "@/components/layout/nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppointmentDialog, CustomerDialog } from "@/components/forms/lazy";

// Client-only: React Haiku's useNetwork reads `navigator` while rendering.
const NetworkStatus = dynamic(() => import("@/components/network/network-status"), { ssr: false });

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto (device)", icon: Monitor },
] as const;

// Theme shortcut: Alt + Shift + D (⌥⇧D on a Mac) switches light / dark from
// anywhere in the CRM. Matched on the physical key, since ⌥ changes the
// character typed on a Mac.
const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function ThemeMenu() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mac, setMac] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyD" || !e.altKey || !e.shiftKey || e.metaKey || e.ctrlKey || e.repeat) return;
      e.preventDefault();
      const next = resolvedTheme === "dark" ? "light" : "dark";
      setTheme(next);
      toast(next === "dark" ? "Dark theme" : "Light theme", { duration: 1500 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resolvedTheme, setTheme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Theme">
          <Sun className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onFocus={() => setMac(isMac())}>
        {THEMES.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            <Icon /> {label}
            {(theme ?? "system") === value && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          Switch light / dark
          <DropdownMenuShortcut>{mac ? "⌥⇧D" : "Alt+Shift+D"}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [customerOpen, setCustomerOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const title = navTitle(pathname);
  const inCustomer = pathname.startsWith("/customers/view");

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:rounded-t-xl">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
      <Breadcrumb className="hidden sm:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/">Arul Motors</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {inCustomer && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/customers/">Customers</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <ActiveCallsPill />
        <NetworkStatus />
        <LiveStatus />
        <CommandMenu onNewCustomer={() => setCustomerOpen(true)} onNewBooking={() => setBookingOpen(true)} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8">
              <Plus /> <span className="hidden sm:inline">New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setCustomerOpen(true)}>
              <UserPlus /> Customer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCustomerOpen(true)}>
              <Motorbike /> Bike sale
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBookingOpen(true)}>
              <CalendarPlus /> Service booking
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Calculator />
        <NotificationsBell />
        <ThemeMenu />
      </div>
      {customerOpen && <CustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} />}
      {bookingOpen && <AppointmentDialog open={bookingOpen} onOpenChange={setBookingOpen} />}
    </header>
  );
}
