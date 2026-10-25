"use client";

import { CalendarPlus, Motorbike, Plus, UserPlus } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppointmentDialog, CustomerDialog } from "@/components/forms/lazy";

// Client-only: React Haiku's useNetwork reads `navigator` while rendering.
const NetworkStatus = dynamic(() => import("@/components/network/network-status"), { ssr: false });

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
        <NotificationsBell />
      </div>
      {customerOpen && <CustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} />}
      {bookingOpen && <AppointmentDialog open={bookingOpen} onOpenChange={setBookingOpen} />}
    </header>
  );
}
