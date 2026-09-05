"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Ban, RotateCcw, X, Percent, Phone, Mail, Car, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { useI18n } from "@/i18n/client";
import { setDriverStatus, setDriverCommission, setUserBlocked } from "@/app/actions/admin";
import { formatDate } from "@/lib/utils";
import type { DriverProfile, DriverStatus } from "@/db/schema";

const STATUS_TONE: Record<DriverStatus, "success" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  pending: "warning",
  suspended: "danger",
  rejected: "danger",
};

export function DriverCard({
  profile,
  user,
  completedRides,
}: {
  profile: DriverProfile;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    blockedAt: Date | null;
    createdAt: Date;
  };
  completedRides: number;
}) {
  const { t, intl } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [commission, setCommission] = useState((profile.commissionBps / 100).toString());

  const statusLabel: Record<DriverStatus, string> = {
    approved: t.driver.statusApproved,
    pending: t.driver.statusPending,
    suspended: t.driver.statusSuspended,
    rejected: t.driver.statusRejected,
  };

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

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base text-ink-100">{user.name ?? user.email}</h3>
            <Badge tone={STATUS_TONE[profile.status]}>{statusLabel[profile.status]}</Badge>
            {user.blockedAt ? <Badge tone="danger">{t.admin.blockUser}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-ink-300">{profile.companyName}</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {t.common.date}: {formatDate(user.createdAt, intl)} · {completedRides}{" "}
            {t.driver.totalRides.toLowerCase()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {profile.status !== "approved" ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => setDriverStatus(user.id, "approved"))}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              {t.admin.approveDriver}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="subtle"
              disabled={pending}
              onClick={() => run(() => setDriverStatus(user.id, "suspended"))}
            >
              <Ban />
              {t.admin.suspendDriver}
            </Button>
          )}

          {profile.status === "suspended" || profile.status === "rejected" ? (
            <Button
              size="sm"
              variant="subtle"
              disabled={pending}
              onClick={() => run(() => setDriverStatus(user.id, "pending"))}
            >
              <RotateCcw />
              {t.admin.reactivateDriver}
            </Button>
          ) : null}

          {profile.status === "pending" ? (
            <Button
              size="sm"
              variant="subtle"
              disabled={pending}
              onClick={() => run(() => setDriverStatus(user.id, "rejected"))}
            >
              <X />
              {t.admin.rejectDriver}
            </Button>
          ) : null}

          <Button
            size="sm"
            variant={user.blockedAt ? "subtle" : "ghost"}
            disabled={pending}
            onClick={() => run(() => setUserBlocked(user.id, !user.blockedAt))}
          >
            {user.blockedAt ? t.admin.unblockUser : t.admin.blockUser}
          </Button>
        </div>
      </div>

      <dl className="mt-5 grid gap-x-8 gap-y-3 border-t border-ink-800 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {user.email ? (
          <div className="flex items-center gap-2 text-ink-300">
            <Mail className="size-3.5 shrink-0 text-gold-600" aria-hidden />
            <a href={`mailto:${user.email}`} className="truncate hover:text-gold-300">
              {user.email}
            </a>
          </div>
        ) : null}
        {user.phone ? (
          <div className="flex items-center gap-2 text-ink-300">
            <Phone className="size-3.5 shrink-0 text-gold-600" aria-hidden />
            <a href={`tel:${user.phone.replace(/\s/g, "")}`} className="hover:text-gold-300">
              {user.phone}
            </a>
          </div>
        ) : null}
        {profile.carMake || profile.licensePlate ? (
          <div className="flex items-center gap-2 text-ink-300">
            <Car className="size-3.5 shrink-0 text-gold-600" aria-hidden />
            <span className="truncate">
              {[profile.carMake, profile.carModel, profile.carYear, profile.licensePlate]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        ) : null}
      </dl>

      {profile.bio ? (
        <p className="mt-4 border-t border-ink-800 pt-4 text-sm leading-relaxed text-ink-300">
          {profile.bio}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-ink-800 pt-5">
        <div className="w-40">
          <label className="mb-1.5 block text-xs text-ink-300" htmlFor={`commission-${user.id}`}>
            {t.driver.commissionRate}
          </label>
          <div className="relative">
            <Input
              id={`commission-${user.id}`}
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="pr-9"
            />
            <Percent
              className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
          </div>
        </div>
        <Button
          size="sm"
          variant="subtle"
          disabled={pending || Number(commission) * 100 === profile.commissionBps}
          onClick={() =>
            run(() => setDriverCommission(user.id, Math.round(Number(commission) * 100)))
          }
        >
          {t.common.save}
        </Button>

        {profile.iban ? (
          <p className="ml-auto text-xs text-ink-500">
            {t.driver.iban}: <span className="text-ink-300">{profile.iban}</span>
          </p>
        ) : null}
      </div>
    </Card>
  );
}
