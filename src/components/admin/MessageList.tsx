"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Reply, Archive, Check, Loader2, Phone } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import { useI18n } from "@/i18n/client";
import { setMessageStatus, replyToMessage } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/utils";
import type { ContactMessage } from "@/db/schema";

export function MessageList({
  rows,
}: {
  rows: { message: ContactMessage; user: { id: string; name: string | null } | null }[];
}) {
  const { t, intl } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, message: string) {
    start(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(message);
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.errorTitle);
      }
    });
  }

  const tone = { new: "warning", read: "neutral", answered: "success", archived: "neutral" } as const;

  return (
    <div className="space-y-4">
      {rows.map(({ message }) => (
        <Card key={message.id} className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base text-ink-100">{message.subject}</h3>
                <Badge tone={tone[message.status]}>{message.status}</Badge>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
                <span>{message.name}</span>
                <a href={`mailto:${message.email}`} className="hover:text-gold-300">
                  <Mail className="mr-1 inline size-3" aria-hidden />
                  {message.email}
                </a>
                {message.phone ? (
                  <a href={`tel:${message.phone.replace(/\s/g, "")}`} className="hover:text-gold-300">
                    <Phone className="mr-1 inline size-3" aria-hidden />
                    {message.phone}
                  </a>
                ) : null}
                <span>{formatDateTime(message.createdAt, intl)}</span>
              </p>
            </div>

            <div className="flex gap-2">
              {message.status === "new" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => setMessageStatus(message.id, "read"), t.admin.saved)}
                >
                  <Check />
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                aria-label="Archive"
                onClick={() => run(() => setMessageStatus(message.id, "archived"), t.admin.saved)}
              >
                <Archive />
              </Button>
              <Button
                size="sm"
                variant="subtle"
                onClick={() => {
                  setReplyingTo(replyingTo === message.id ? null : message.id);
                  setReply("");
                }}
              >
                <Reply />
                {t.contact.send}
              </Button>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-line border-t border-ink-800 pt-4 text-sm leading-relaxed text-ink-200">
            {message.message}
          </p>

          {message.adminReply ? (
            <div className="mt-4 rounded-sm border border-gold-600/30 bg-gold-500/6 px-4 py-3">
              <p className="text-[0.65rem] uppercase tracking-wider text-gold-400">
                {t.contact.subjectOptions.other}
                {message.repliedAt ? ` · ${formatDateTime(message.repliedAt, intl)}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-200">{message.adminReply}</p>
            </div>
          ) : null}

          {replyingTo === message.id ? (
            <div className="mt-4 space-y-3 border-t border-ink-800 pt-4">
              <Textarea
                rows={4}
                autoFocus
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t.contact.message}
              />
              <Button
                size="sm"
                disabled={pending || reply.trim().length < 5}
                onClick={() =>
                  run(async () => {
                    const result = await replyToMessage(message.id, reply);
                    if (result.ok) {
                      setReplyingTo(null);
                      setReply("");
                    }
                    return result;
                  }, t.contact.success)
                }
              >
                {pending ? <Loader2 className="animate-spin" /> : <Reply />}
                {t.contact.send}
              </Button>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
