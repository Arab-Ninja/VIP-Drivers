import type { Metadata } from "next";
import { UserCog } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireRole } from "@/lib/auth";
import { listDrivers } from "@/server/drivers";
import { countUnreadMessages } from "@/server/admin";
import { DashboardShell, EmptyState } from "@/components/DashboardShell";
import { adminTabs } from "@/components/admin/AdminTabs";
import { DriverCard } from "@/components/admin/DriverCard";

export const metadata: Metadata = { title: "Chauffeurs", robots: { index: false } };

export default async function AdminDriversPage() {
  await requireRole("admin");
  const { t } = await getTranslations();
  const [rows, unread] = await Promise.all([listDrivers(), countUnreadMessages()]);

  // Applications awaiting a decision go first: they are the only rows that
  // need the operator to do something.
  const sorted = [...rows].sort((a, b) => {
    const rank = (s: string) => (s === "pending" ? 0 : s === "approved" ? 1 : 2);
    return rank(a.profile.status) - rank(b.profile.status);
  });

  return (
    <DashboardShell
      title={t.admin.drivers}
      subtitle={`${rows.length}`}
      activeHref="/admin/drivers"
      tabs={adminTabs(t, { messages: unread || undefined })}
    >
      {rows.length === 0 ? (
        <EmptyState icon={UserCog} title={t.common.noResults} />
      ) : (
        <div className="space-y-4">
          {sorted.map((row) => (
            <DriverCard
              key={row.profile.id}
              profile={row.profile}
              user={row.user}
              completedRides={row.completedRides}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
