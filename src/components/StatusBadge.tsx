import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/i18n";
import type { BookingStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * The single place the booking lifecycle is rendered. Clients, drivers and
 * admins all see the same colour for the same state, which is what makes the
 * status readable at a glance across the whole product.
 */
const STATUS_TONE = {
  pending: "warning",
  confirmed: "success",
  completed: "info",
  cancelled: "danger",
} as const;

const STATUS_DOT = {
  pending: "bg-warning",
  confirmed: "bg-success",
  completed: "bg-info",
  cancelled: "bg-danger",
} as const;

export function StatusBadge({
  status,
  t,
  withHint = false,
  className,
}: {
  status: BookingStatus;
  t: Dictionary;
  withHint?: boolean;
  className?: string;
}) {
  const hintKey = `${status}Hint` as const;
  return (
    <Badge tone={STATUS_TONE[status]} className={className}>
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} aria-hidden />
      {t.status[status]}
      {withHint ? (
        <span className="font-normal opacity-70">· {t.status[hintKey]}</span>
      ) : null}
    </Badge>
  );
}

export function PaymentBadge({
  paymentStatus,
  t,
}: {
  paymentStatus: "unpaid" | "processing" | "paid" | "refunded" | "failed";
  t: Dictionary;
}) {
  const tone =
    paymentStatus === "paid"
      ? "success"
      : paymentStatus === "failed"
        ? "danger"
        : paymentStatus === "refunded"
          ? "info"
          : "neutral";
  return <Badge tone={tone}>{t.status[paymentStatus]}</Badge>;
}
