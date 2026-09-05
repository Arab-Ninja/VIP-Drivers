"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, UserMinus, Lock, Unlock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { setUserBlocked, setUserRole } from "@/app/actions/admin";
import { formatCents } from "@/lib/pricing";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/db/schema";

export type ClientRow = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    role: UserRole;
    blockedAt: Date | null;
    createdAt: Date;
  };
  bookingCount: number;
  spentCents: number;
};

export function ClientTable({ rows, currentUserId }: { rows: ClientRow[]; currentUserId: string }) {
  const { t, intl } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(t.admin.saved);
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.errorTitle);
      }
    });
  }

  const roleTone = { admin: "gold", driver: "info", client: "neutral" } as const;

  return (
    <div className="surface overflow-hidden rounded-lg">
      {/* A table on desktop, stacked cards on a phone. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-left">
              {[t.contact.name, t.common.status, t.admin.kpiBookings, t.admin.kpiRevenue, t.common.date, ""].map(
                (heading, i) => (
                  <th
                    key={i}
                    className="px-5 py-3 text-[0.65rem] font-medium uppercase tracking-wider text-ink-400"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {rows.map(({ user, bookingCount, spentCents }) => (
              <tr key={user.id} className="transition-colors hover:bg-ink-850/60">
                <td className="px-5 py-4">
                  <p className="text-ink-100">{user.name ?? "—"}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{user.email}</p>
                  {user.phone ? <p className="text-xs text-ink-500">{user.phone}</p> : null}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={roleTone[user.role]}>{user.role}</Badge>
                    {user.blockedAt ? <Badge tone="danger">{t.admin.blockUser}</Badge> : null}
                  </div>
                </td>
                <td className="px-5 py-4 tabular-nums text-ink-200">{bookingCount}</td>
                <td className="px-5 py-4 tabular-nums text-gold-300">
                  {formatCents(spentCents, intl)}
                </td>
                <td className="px-5 py-4 text-xs text-ink-400">{formatDate(user.createdAt, intl)}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {user.id !== currentUserId ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          title={user.role === "admin" ? t.admin.makeClient : t.admin.makeAdmin}
                          onClick={() =>
                            run(() =>
                              setUserRole(user.id, user.role === "admin" ? "client" : "admin"),
                            )
                          }
                        >
                          {user.role === "admin" ? <UserMinus /> : <ShieldCheck />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          title={user.blockedAt ? t.admin.unblockUser : t.admin.blockUser}
                          onClick={() => run(() => setUserBlocked(user.id, !user.blockedAt))}
                        >
                          {user.blockedAt ? <Unlock /> : <Lock />}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-ink-500">{t.common.yes}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-ink-800 lg:hidden">
        {rows.map(({ user, bookingCount, spentCents }) => (
          <div key={user.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-ink-100">{user.name ?? "—"}</p>
                <p className="mt-0.5 truncate text-xs text-ink-400">{user.email}</p>
              </div>
              <Badge tone={roleTone[user.role]}>{user.role}</Badge>
            </div>
            <p className="mt-3 text-xs text-ink-400">
              {bookingCount} · <span className="text-gold-300">{formatCents(spentCents, intl)}</span>
            </p>
            {user.id !== currentUserId ? (
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="subtle"
                  disabled={pending}
                  onClick={() =>
                    run(() => setUserRole(user.id, user.role === "admin" ? "client" : "admin"))
                  }
                >
                  {user.role === "admin" ? t.admin.makeClient : t.admin.makeAdmin}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => setUserBlocked(user.id, !user.blockedAt))}
                >
                  {user.blockedAt ? t.admin.unblockUser : t.admin.blockUser}
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
