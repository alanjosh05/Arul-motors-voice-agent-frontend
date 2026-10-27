"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, KeyRound, LogOut, Monitor, Moon, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { visibleNav } from "@/components/layout/nav";
import { pop, useAnime } from "@/lib/motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { initials } from "@/lib/format";
import { prefetchPage, useStats, useVoiceEnabled, useVoiceStatus } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { SidebarPlant } from "@/components/art/sidebar-plant";

/** The Arul Motors logo: the red AM monogram, no background (vector, after
 * the client's badge). `full` adds ARUL MOTORS / NAZARETH / YAMAHA in white,
 * for dark or coloured panels (login). Size it with className (default 32px). */
export function BrandMark({ className, full = false }: { className?: string; full?: boolean }) {
  return (
    <Image
      src={full ? "/brand/logo-badge.svg" : "/brand/logo-mark.svg"}
      alt="Arul Motors Yamaha, Nazareth"
      width={full ? 320 : 360}
      height={full ? 352 : 360}
      unoptimized
      priority
      className={cn("size-8 shrink-0", className)}
    />
  );
}

function AgentStatus() {
  const { data, isLoading } = useVoiceStatus();
  const voiceOn = useVoiceEnabled();
  const online = data?.online;
  if (!voiceOn) return null; // switched off in Settings: nothing to show
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background/60 px-2.5 py-2 text-xs group-data-[collapsible=icon]:hidden">
      <span className="relative flex size-2">
        {online && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
        <span className={cn("relative inline-flex size-2 rounded-full", isLoading ? "bg-muted-foreground" : online ? "bg-success" : "bg-destructive")} />
      </span>
      <span className="font-medium">Voice agent</span>
      <span className="ml-auto text-muted-foreground">{isLoading ? "Checking…" : online ? "Online" : "Offline"}</span>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
  if (!user) return null;
  const name = user.full_name || user.username;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground capitalize">{user.role}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun /> Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light"><Sun /> Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark"><Moon /> Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system"><Monitor /> System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem asChild>
            <Link href="/settings/"><KeyRound /> Change password</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} variant="destructive">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A nav badge that pops when its count changes. */
function NavBadge({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useAnime(ref, (anime, el) => pop(anime, el), [count]);
  return (
    <SidebarMenuBadge ref={ref} className="tabular rounded-full bg-primary/10 text-primary">
      {count}
    </SidebarMenuBadge>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  // Menu items slide in when the CRM opens; icons wiggle on hover.
  useAnime(
    contentRef,
    ({ animate, stagger, utils }, el) => {
      const items = [...el.querySelectorAll<HTMLElement>("[data-sidebar=group-label], [data-sidebar=menu-item]")];
      utils.set(items, { opacity: 0 });
      animate(items, {
        opacity: [0, 1],
        translateX: [-14, 0],
        duration: 550,
        ease: "outExpo",
        delay: stagger(35, { start: 80 }),
        // Then hand the items back to the sidebar's own styles: a left-over
        // inline opacity kept the group titles showing when it collapsed.
        // (Not utils.cleanInlineStyles: it restores the opacity 0 set above.)
        onComplete: () => {
          for (const item of items) {
            item.style.removeProperty("opacity");
            item.style.removeProperty("transform");
          }
        },
      });
      let last: Element | null = null;
      const wiggle = (e: MouseEvent) => {
        const button = (e.target as Element).closest("[data-sidebar=menu-button]");
        if (button === last) return;
        last = button;
        const icon = button?.querySelector("svg");
        if (icon)
          animate(icon, { rotate: [0, -14, 10, 0], scale: [1, 1.2, 1], duration: 500, ease: "outQuad" });
      };
      const leave = () => (last = null);
      el.addEventListener("mouseover", wiggle);
      el.addEventListener("mouseleave", leave);
      return () => {
        el.removeEventListener("mouseover", wiggle);
        el.removeEventListener("mouseleave", leave);
      };
    },
    [],
  );
  // The page you've just opened: its icon gives a little bounce.
  useAnime(
    contentRef,
    ({ animate }, el) => {
      const icon = el.querySelector("[data-sidebar=menu-button][data-active=true] svg");
      if (icon) animate(icon, { scale: [0.6, 1], ease: "outElastic(1, .5)", duration: 700 });
    },
    [pathname],
  );
  const { data: stats } = useStats();
  const { setOpenMobile } = useSidebar();
  const queryClient = useQueryClient();
  const badges = {
    due: stats?.totals.due_this_week,
    today: stats?.totals.appointments_today,
  };
  const { user } = useAuth();
  const nav = visibleNav(user?.role);
  const groups = [...new Set(nav.map((item) => item.group))];

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard/">
                <BrandMark />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold tracking-tight">Arul Motors</span>
                  <span className="truncate text-xs text-muted-foreground">Yamaha · Nazareth</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent ref={contentRef}>
        {groups.map((group, i) => (
          <SidebarGroup key={group}>
            {/* Closed (icons only): a short line between sections stands in for their titles. */}
            {i > 0 && <div aria-hidden className="mx-auto mb-2 hidden h-px w-6 bg-sidebar-border group-data-[collapsible=icon]:block" />}
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="group-data-[collapsible=icon]:gap-2">
                {nav.filter((item) => item.group === group).map((item) => {
                  const active = pathname.startsWith(item.href.replace(/\/$/, ""));
                  const count = item.badge ? badges[item.badge] : undefined;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link
                          href={item.href}
                          onClick={() => setOpenMobile(false)}
                          // Load the page's data while the pointer is on its way.
                          onPointerEnter={() => prefetchPage(queryClient, item.href)}
                          onFocus={() => prefetchPage(queryClient, item.href)}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {!!count && <NavBadge count={count} />}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="relative">
        {/* Decoration: leafy plants peeking in from the bottom-right corner,
            just above the footer. Takes no space and can't be clicked; hidden
            when the sidebar is closed. */}
        <div aria-hidden className="pointer-events-none absolute right-0 bottom-full w-24 -scale-x-100 opacity-85 group-data-[collapsible=icon]:hidden">
          <SidebarPlant className="h-auto w-full" />
        </div>
        <AgentStatus />
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
