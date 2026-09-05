import { CarFront, ListChecks, Wallet, User } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { DashboardTab } from "@/components/DashboardShell";

export function driverTabs(t: Dictionary, availableCount?: number): DashboardTab[] {
  return [
    { href: "/driver", label: t.driver.available, icon: CarFront, badge: availableCount },
    { href: "/driver/rides", label: t.driver.myRides, icon: ListChecks },
    { href: "/driver/earnings", label: t.driver.earnings, icon: Wallet },
    { href: "/driver/profile", label: t.driver.profile, icon: User },
  ];
}
