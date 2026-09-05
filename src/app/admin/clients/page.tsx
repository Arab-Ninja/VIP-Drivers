import type { Metadata } from "next";
import { Users, Search } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireRole } from "@/lib/auth";
import { listClients, countUnreadMessages } from "@/server/admin";
import { DashboardShell, EmptyState } from "@/components/DashboardShell";
import { adminTabs } from "@/components/admin/AdminTabs";
import { ClientTable } from "@/components/admin/ClientTable";
import { Input } from "@/components/ui/field";

export const metadata: Metadata = { title: "Clients", robots: { index: false } };

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireRole("admin");
  const params = await searchParams;
  const { t } = await getTranslations();

  const [rows, unread] = await Promise.all([listClients(params.q), countUnreadMessages()]);

  return (
    <DashboardShell
      title={t.admin.clients}
      subtitle={`${rows.length}`}
      activeHref="/admin/clients"
      tabs={adminTabs(t, { messages: unread || undefined })}
      actions={
        <form action="/admin/clients" method="get" className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder={`${t.common.search}…`}
            className="pl-9"
            aria-label={t.common.search}
          />
        </form>
      }
    >
      {rows.length === 0 ? (
        <EmptyState icon={Users} title={t.common.noResults} />
      ) : (
        <ClientTable rows={rows} currentUserId={admin.id} />
      )}
    </DashboardShell>
  );
}
