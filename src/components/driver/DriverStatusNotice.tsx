import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n";
import type { DriverStatus } from "@/db/schema";

/**
 * Tells a partner exactly where their application stands, and — when they
 * cannot yet work — why not. A driver who sees an empty ride board with no
 * explanation assumes the product is broken.
 */
export function DriverStatusNotice({ status, t }: { status: DriverStatus; t: Dictionary }) {
  if (status === "approved") return null;

  const config = {
    pending: {
      icon: Clock,
      tone: "border-warning/40 bg-warning/8",
      iconTone: "text-warning",
      title: t.driver.statusPending,
      body: t.driver.statusPendingHint,
    },
    suspended: {
      icon: AlertTriangle,
      tone: "border-danger/40 bg-danger/8",
      iconTone: "text-danger",
      title: t.driver.statusSuspended,
      body: t.driver.statusSuspendedHint,
    },
    rejected: {
      icon: XCircle,
      tone: "border-danger/40 bg-danger/8",
      iconTone: "text-danger",
      title: t.driver.statusRejected,
      body: t.driver.statusSuspendedHint,
    },
  }[status];

  return (
    <div className={`mb-8 flex flex-wrap items-start gap-4 rounded-lg border px-5 py-4 ${config.tone}`}>
      <config.icon className={`mt-0.5 size-5 shrink-0 ${config.iconTone}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-100">{config.title}</p>
        <p className="mt-1 text-sm text-ink-300">{config.body}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/contact">{t.nav.contact}</Link>
      </Button>
    </div>
  );
}

export function DriverApprovedBanner({ t }: { t: Dictionary }) {
  return (
    <div className="mb-8 flex items-center gap-3 rounded-lg border border-success/40 bg-success/8 px-5 py-3">
      <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
      <p className="text-sm text-ink-200">{t.driver.statusApproved}</p>
    </div>
  );
}
