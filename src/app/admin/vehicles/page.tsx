import type { Metadata } from "next";

import { getTranslations } from "@/i18n";
import { requireRole } from "@/lib/auth";
import { getAllVehicles } from "@/server/fleet";
import { countUnreadMessages } from "@/server/admin";
import { DashboardShell } from "@/components/DashboardShell";
import { adminTabs } from "@/components/admin/AdminTabs";
import { VehicleEditor } from "@/components/admin/VehicleEditor";

export const metadata: Metadata = { title: "Véhicules", robots: { index: false } };

export default async function AdminVehiclesPage() {
  await requireRole("admin");
  const { t } = await getTranslations();
  const [vehicles, unread] = await Promise.all([getAllVehicles(), countUnreadMessages()]);

  return (
    <DashboardShell
      title={t.admin.vehicles}
      subtitle={t.fleet.subtitle}
      activeHref="/admin/vehicles"
      tabs={adminTabs(t, { messages: unread || undefined })}
    >
      <VehicleEditor vehicles={vehicles} />
    </DashboardShell>
  );
}
