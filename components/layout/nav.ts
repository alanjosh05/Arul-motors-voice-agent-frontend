import {
  CalendarCheck,
  Contact,
  FileSpreadsheet,
  Headset,
  IndianRupee,
  LayoutDashboard,
  type LucideIcon,
  Motorbike,
  Package,
  PhoneOutgoing,
  Receipt,
  Settings,
  ShieldCheck,
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
  badge?: "due" | "today" | "insurance";
  /** Only admins see it (accounts: salaries, P&L). */
  adminOnly?: boolean;
};

export const NAV: NavItem[] = [
  { title: "Dashboard", href: "/dashboard/", icon: LayoutDashboard, group: "Overview" },
  // Customers: who they are, what they ride, and keeping in touch.
  { title: "Customers", href: "/customers/", icon: Users, group: "Customers" },
  { title: "Bikes", href: "/bikes/", icon: Motorbike, group: "Customers" },
  { title: "Follow-ups", href: "/follow-ups/", icon: PhoneOutgoing, group: "Customers", badge: "due" },
  { title: "Call log", href: "/calls/", icon: Headset, group: "Customers" },
  { title: "Insurance", href: "/insurance/", icon: ShieldCheck, group: "Customers", badge: "insurance" },
  // Workshop: bookings, the parts they use, and the service schedule.
  { title: "Appointments", href: "/appointments/", icon: CalendarCheck, group: "Workshop", badge: "today" },
  { title: "Parts used", href: "/parts/", icon: Package, group: "Workshop" },
  { title: "Service types", href: "/service-types/", icon: Wrench, group: "Workshop" },
  // Accounts: pages provisioned, being built (each shows "Coming soon").
  { title: "Profit & loss", href: "/profit-loss/", icon: TrendingUp, group: "Accounts", adminOnly: true },
  { title: "Income", href: "/income/", icon: IndianRupee, group: "Accounts", adminOnly: true },
  { title: "Expenses", href: "/expenses/", icon: Receipt, group: "Accounts", adminOnly: true },
  { title: "Salaries", href: "/salaries/", icon: Wallet, group: "Accounts", adminOnly: true },
  { title: "Reports", href: "/reports/", icon: FileSpreadsheet, group: "Accounts", adminOnly: true },
  { title: "Our staff", href: "/our-staff/", icon: Contact, group: "Workspace" },
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
