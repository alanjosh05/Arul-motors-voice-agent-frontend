import {
  CalendarCheck,
  Contact,
  FileSpreadsheet,
  Headset,
  IndianRupee,
  LayoutDashboard,
  type LucideIcon,
  Motorbike,
  PhoneOutgoing,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  group: string;
  badge?: "due" | "today";
  /** Only admins see it (accounts: salaries, P&L). */
  adminOnly?: boolean;
};

export const NAV: NavItem[] = [
  { title: "Dashboard", href: "/dashboard/", icon: LayoutDashboard, group: "Overview" },
  { title: "Follow-ups", href: "/follow-ups/", icon: PhoneOutgoing, group: "CRM", badge: "due" },
  { title: "Call log", href: "/calls/", icon: Headset, group: "CRM" },
  { title: "Appointments", href: "/appointments/", icon: CalendarCheck, group: "CRM", badge: "today" },
  { title: "Customers", href: "/customers/", icon: Users, group: "CRM" },
  { title: "Bikes", href: "/bikes/", icon: Motorbike, group: "CRM" },
  // Accounts: pages provisioned, being built (each shows "Coming soon").
  { title: "Profit & loss", href: "/profit-loss/", icon: TrendingUp, group: "Accounts", adminOnly: true },
  { title: "Income", href: "/income/", icon: IndianRupee, group: "Accounts", adminOnly: true },
  { title: "Expenses", href: "/expenses/", icon: Receipt, group: "Accounts", adminOnly: true },
  { title: "Salaries", href: "/salaries/", icon: Wallet, group: "Accounts", adminOnly: true },
  { title: "Reports", href: "/reports/", icon: FileSpreadsheet, group: "Accounts", adminOnly: true },
  { title: "Our staff", href: "/our-staff/", icon: Contact, group: "Workspace" },
  { title: "Service types", href: "/service-types/", icon: Wrench, group: "Workspace" },
  { title: "Settings", href: "/settings/", icon: Settings, group: "Workspace" },
];

/** The pages this user may open (accounts only for admins). */
export function visibleNav(role?: string): NavItem[] {
  return NAV.filter((item) => !item.adminOnly || role === "admin");
}

export function navTitle(pathname: string): string {
  if (pathname.startsWith("/customers/view")) return "Customer";
  return NAV.find((item) => pathname.startsWith(item.href.replace(/\/$/, "")))?.title ?? "";
}
