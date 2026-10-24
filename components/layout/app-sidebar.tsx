"use client";

import { ChevronsUpDown, KeyRound, LogOut, Monitor, Moon, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth-provider";
import { NAV } from "@/components/layout/nav";
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
import { useStats, useVoiceEnabled, useVoiceStatus } from "@/lib/queries";
import { cn } from "@/lib/utils";

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

export function AppSidebar() {
  const pathname = usePathname();
  const { data: stats } = useStats();
  const { setOpenMobile } = useSidebar();
  const badges = {
    due: stats?.totals.due_this_week,
    today: stats?.totals.appointments_today,
  };
  const groups = [...new Set(NAV.map((item) => item.group))];

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
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.filter((item) => item.group === group).map((item) => {
                  const active = pathname.startsWith(item.href.replace(/\/$/, ""));
                  const count = item.badge ? badges[item.badge] : undefined;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link href={item.href} onClick={() => setOpenMobile(false)}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {!!count && <SidebarMenuBadge className="tabular rounded-full bg-primary/10 text-primary">{count}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
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
