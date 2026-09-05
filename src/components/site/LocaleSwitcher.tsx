"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { setLocale } from "@/app/actions/locale";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Globe className="size-3.5 text-ink-400" aria-hidden />
      {(["fr", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          disabled={pending || code === locale}
          onClick={() => startTransition(() => setLocale(code))}
          aria-current={code === locale ? "true" : undefined}
          className={cn(
            "px-1.5 py-1 text-xs uppercase tracking-widest transition-colors",
            code === locale ? "text-gold-300" : "text-ink-400 hover:text-ink-100 disabled:opacity-50",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
