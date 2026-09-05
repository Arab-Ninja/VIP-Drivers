import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireRole } from "@/lib/auth";
import { listContactMessages, countUnreadMessages } from "@/server/admin";
import { DashboardShell, EmptyState } from "@/components/DashboardShell";
import { adminTabs } from "@/components/admin/AdminTabs";
import { MessageList } from "@/components/admin/MessageList";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function AdminMessagesPage() {
  await requireRole("admin");
  const { t } = await getTranslations();
  const [rows, unread] = await Promise.all([listContactMessages(), countUnreadMessages()]);

  return (
    <DashboardShell
      title={t.admin.messages}
      subtitle={`${rows.length}`}
      activeHref="/admin/messages"
      tabs={adminTabs(t, { messages: unread || undefined })}
    >
      {rows.length === 0 ? (
        <EmptyState icon={Mail} title={t.common.noResults} />
      ) : (
        <MessageList rows={rows} />
      )}
    </DashboardShell>
  );
}
