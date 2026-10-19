import { CalendarCheck, Headset, LayoutDashboard, Motorbike, PhoneOutgoing, Settings, Users, Wrench } from "lucide-react";

export const NAV = [
  { title: "Dashboard", href: "/dashboard/", icon: LayoutDashboard, group: "Overview" },
  { title: "Follow-ups", href: "/follow-ups/", icon: PhoneOutgoing, group: "CRM", badge: "due" as const },
  { title: "Customers", href: "/customers/", icon: Users, group: "CRM" },
  { title: "Bikes", href: "/bikes/", icon: Motorbike, group: "CRM" },
  { title: "Appointments", href: "/appointments/", icon: CalendarCheck, group: "CRM", badge: "today" as const },
  { title: "Call log", href: "/calls/", icon: Headset, group: "CRM" },
  { title: "Service types", href: "/service-types/", icon: Wrench, group: "Workspace" },
  { title: "Settings", href: "/settings/", icon: Settings, group: "Workspace" },
];

export function navTitle(pathname: string): string {
  if (pathname.startsWith("/customers/view")) return "Customer";
  return NAV.find((item) => pathname.startsWith(item.href.replace(/\/$/, "")))?.title ?? "";
}
