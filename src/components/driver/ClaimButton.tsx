"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Hand, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { claimRide, markRideCompleted } from "@/app/actions/driver";
import { useI18n } from "@/i18n/client";

export function ClaimButton({ bookingId, disabled }: { bookingId: string; disabled?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClaim() {
    start(async () => {
      const result = await claimRide(bookingId);
      if (result.ok) {
        toast.success(t.driver.claimed);
        router.refresh();
        return;
      }
      // "taken" is the expected outcome of two drivers racing for the same
      // ride, so it gets its own message rather than a generic failure.
      toast.error(
        result.error === "taken"
          ? t.driver.claimTaken
          : result.error === "not_approved"
            ? t.driver.statusPendingHint
            : t.common.errorTitle,
      );
      router.refresh();
    });
  }

  return (
    <Button size="sm" onClick={onClaim} disabled={pending || disabled}>
      {pending ? <Loader2 className="animate-spin" /> : <Hand />}
      {pending ? t.driver.claiming : t.driver.claim}
    </Button>
  );
}

export function CompleteButton({ bookingId }: { bookingId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function onComplete() {
    start(async () => {
      const result = await markRideCompleted(bookingId);
      if (result.ok) {
        toast.success(t.driver.completedOk);
        router.refresh();
      } else {
        toast.error(t.common.errorTitle);
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onComplete} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
      {t.driver.markCompleted}
    </Button>
  );
}
