import { cn } from "@/lib/utils";

/**
 * The wordmark. A gold monogram plate beside the name, sized by a single
 * `compact` switch so the header, footer and auth pages stay consistent.
 */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative grid place-items-center border border-gold-600/60 bg-gradient-to-br from-ink-800 to-ink-950",
          compact ? "size-8" : "size-10",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "font-display leading-none text-gradient-gold",
            compact ? "text-sm" : "text-base",
          )}
        >
          VD
        </span>
        <span className="absolute inset-x-1 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/70 to-transparent" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display tracking-[0.18em] text-ink-100",
            compact ? "text-sm" : "text-lg",
          )}
        >
          VIP DRIVERS
        </span>
        {!compact ? (
          <span className="mt-1 text-[0.6rem] tracking-[0.3em] text-gold-500/80">BRUXELLES</span>
        ) : null}
      </span>
    </span>
  );
}
