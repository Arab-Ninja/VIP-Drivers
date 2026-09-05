import { LayoutDashboard, CalendarRange, Users, UserCog, CarFront, Mail, Settings } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { DashboardTab } from "@/components/DashboardShell";

export function adminTabs(t: Dictionary, badges: { messages?: number } = {}): DashboardTab[] {
  return [
    { href: "/admin", label: t.admin.overview, icon: LayoutDashboard },
    { href: "/admin/bookings", label: t.admin.bookings, icon: CalendarRange },
    { href: "/admin/drivers", label: t.admin.drivers, icon: UserCog },
    { href: "/admin/clients", label: t.admin.clients, icon: Users },
    { href: "/admin/vehicles", label: t.admin.vehicles, icon: CarFront },
    { href: "/admin/messages", label: t.admin.messages, icon: Mail, badge: badges.messages },
    { href: "/admin/settings", label: t.admin.settings, icon: Settings },
  ];
}
