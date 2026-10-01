"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/app/actions/notifications";
import { useI18n, fill } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * The notification centre.
 *
 * This is the channel that works with nothing configured — no VAPID keys, no
 * mail provider — so an operator always has somewhere to see that a client
 * has written in or a booking has come through. Push and email, when they are
 * set up, mirror this rather than replace it.
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const { t, intl } = useI18n();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchNotifications();
      setItems(result.items);
      setUnread(result.unread);
    } catch {
      // A failed refresh must not break the header.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Keep the badge roughly current without hammering the server.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !open) {
        void fetchNotifications()
          .then((r) => setUnread(r.unread))
          .catch(() => {});
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  async function onOpenItem(item: NotificationItem) {
    if (!item.read) {
      setItems((current) =>
        current.map((i) => (i.id === item.id ? { ...i, read: true } : i)),
      );
      setUnread((n) => Math.max(0, n - 1));
      await markNotificationRead(item.id).catch(() => {});
    }
    setOpen(false);
    if (item.url) router.push(item.url);
  }

  async function onMarkAll() {
    setItems((current) => current.map((i) => ({ ...i, read: true })));
    setUnread(0);
    await markAllNotificationsRead().catch(() => {});
  }

  const formatWhen = (iso: string) =>
    new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short" }).format(
      new Date(iso),
    );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={
          unread > 0 ? fill(t.notifications.unreadCount, { n: unread }) : t.notifications.title
        }
        className="relative grid size-9 place-items-center text-ink-200 transition-colors hover:text-gold-200"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-gold-500 px-1 text-[0.6rem] font-medium leading-4 text-ink-950">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t.notifications.title}
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-ink-600 bg-ink-850 shadow-lift"
        >
          <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
            <p className="text-sm text-ink-100">{t.notifications.title}</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={onMarkAll}
                className="inline-flex items-center gap-1.5 text-xs text-gold-300 hover:text-gold-200"
              >
                <Check className="size-3" />
                {t.notifications.markAllRead}
              </button>
            ) : null}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-ink-400">
                <Loader2 className="size-4 animate-spin" />
                {t.common.loading}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-ink-400">
                {t.notifications.empty}
              </p>
            ) : (
              <ul className="divide-y divide-ink-800">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpenItem(item)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-800",
                        !item.read && "bg-gold-500/6",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          item.read ? "bg-ink-600" : "bg-gold-400",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink-100">{item.title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-ink-300">
                          {item.body}
                        </span>
                        <span className="mt-1 block text-[0.65rem] text-ink-500">
                          {formatWhen(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-ink-700 px-4 py-2.5">
            <Link
              href="/account/profile"
              onClick={() => setOpen(false)}
              className="text-xs text-ink-400 hover:text-gold-300"
            >
              {t.notifications.enable}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
