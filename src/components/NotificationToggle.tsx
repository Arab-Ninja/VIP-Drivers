"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { savePushSubscription, removePushSubscription } from "@/app/actions/push";
import { useI18n } from "@/i18n/client";

/** VAPID public keys are base64url; the Push API wants raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalised);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "unsupported" | "unconfigured" | "denied" | "off" | "on" | "working";

export function NotificationToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<State>("working");

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  useEffect(() => {
    async function init() {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (!vapidKey) {
        setState("unconfigured");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        setState(existing ? "on" : "off");
      } catch {
        setState("off");
      }
    }
    void init();
  }, [vapidKey]);

  async function enable() {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const result = await savePushSubscription(
        JSON.parse(JSON.stringify(subscription)),
        navigator.userAgent,
      );
      if (!result.ok) throw new Error("save failed");

      setState("on");
      toast.success(t.notifications.enabled);
    } catch (error) {
      console.error("[push] enable failed", error);
      setState("off");
      toast.error(t.common.errorTitle);
    }
  }

  async function disable() {
    setState("working");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  const message =
    state === "unsupported"
      ? t.notifications.unsupported
      : state === "denied"
        ? t.notifications.blocked
        : state === "unconfigured"
          ? "Les notifications push ne sont pas encore configurées sur ce déploiement."
          : null;

  return (
    <Card className="flex max-w-xl flex-wrap items-center justify-between gap-4 p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center border border-gold-600/40 bg-gold-500/8 text-gold-300">
          {state === "on" ? <BellRing className="size-4" /> : <Bell className="size-4" />}
        </span>
        <div>
          <p className="text-sm text-ink-100">{t.notifications.enable}</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-400">
            {message ??
              "Recevez une alerte lorsqu'une réservation change de statut ou qu'un trajet vous est attribué."}
          </p>
        </div>
      </div>

      {state === "on" ? (
        <Button variant="subtle" size="sm" onClick={disable}>
          <BellOff />
          {t.common.close}
        </Button>
      ) : state === "off" ? (
        <Button size="sm" onClick={enable}>
          <Bell />
          {t.notifications.enable}
        </Button>
      ) : null}
    </Card>
  );
}
