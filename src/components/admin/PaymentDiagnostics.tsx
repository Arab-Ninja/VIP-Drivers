"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Loader2, AlertTriangle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyAllPendingPayments } from "@/app/actions/payment";
import { useI18n, fill } from "@/i18n/client";

/**
 * Recovery for payments the webhook never confirmed.
 *
 * The webhook stays the primary path, but when it is misconfigured every
 * client who paid is left in "pending" with no way for the operator to put it
 * right. This asks Stripe about each of them in one go.
 */
export function PaymentDiagnostics({ webhookConfigured }: { webhookConfigured: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function onVerify() {
    start(async () => {
      const result = await verifyAllPendingPayments();
      if (!result.ok) {
        toast.error(t.common.errorTitle);
        return;
      }
      toast.success(
        fill(t.admin.verifyPaymentsDone, {
          checked: result.checked,
          confirmed: result.confirmed,
        }),
      );
      router.refresh();
    });
  }

  return (
    <Card className="p-6">
      <h2 className="eyebrow">Paiements</h2>

      {!webhookConfigured ? (
        <p className="mt-4 flex gap-2.5 rounded-sm border border-warning/40 bg-warning/8 px-4 py-3 text-xs leading-relaxed text-[#e8c377]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t.admin.webhookMissing}
        </p>
      ) : null}

      <p className="mt-4 max-w-2xl text-xs leading-relaxed text-ink-400">
        Vérifie auprès de Stripe chaque réservation dont le paiement a été lancé mais jamais
        confirmé, et la passe en « confirmé » si le paiement est bien passé.
      </p>

      <Button className="mt-5" variant="subtle" onClick={onVerify} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {t.admin.verifyPayments}
      </Button>
    </Card>
  );
}
