import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/site/Section";
import { cn } from "@/lib/utils";

export type DashboardTab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

/**
 * Shared chrome for the three signed-in areas (client, driver, admin).
 * One horizontal tab strip rather than a sidebar, because it collapses to a
 * scrollable row on a phone without a drawer.
 */
/** True when `href` is an ancestor route of `pathname`. */
function isPrefixOf(href: string, pathname: string): boolean {
  return href !== "/" && pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  title,
  subtitle,
  tabs,
  activeHref,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  tabs: DashboardTab[];
  activeHref: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const exactMatch = tabs.some((tab) => tab.href === activeHref);

  return (
    <>
      <div className="border-b border-ink-800 bg-ink-900/40">
        <Container className="pt-12 pb-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl text-ink-100 lg:text-4xl">{title}</h1>
              {subtitle ? <p className="mt-2 text-sm text-ink-300">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
          </div>

          <nav className="-mx-5 mt-8 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:px-0" aria-label={title}>
            {tabs.map((tab) => {
              // Prefix matching is only a fallback for a nested route no tab
              // names exactly. Without that guard "/driver" would light up
              // alongside "/driver/earnings", marking two tabs current.
              const active = exactMatch ? tab.href === activeHref : isPrefixOf(tab.href, activeHref);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs uppercase tracking-[0.14em] transition-colors",
                    active
                      ? "border-gold-500 text-gold-300"
                      : "border-transparent text-ink-300 hover:text-ink-100",
                  )}
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                  {tab.badge ? (
                    <span className="rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[0.65rem] text-gold-200">
                      {tab.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </Container>
      </div>

      <Container className="py-10 lg:py-12">{children}</Container>
    </>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon: Icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface flex flex-col items-center rounded-lg px-6 py-16 text-center">
      {Icon ? <Icon className="size-8 text-ink-500" /> : null}
      <p className="mt-5 text-base text-ink-100">{title}</p>
      {body ? <p className="mt-2 max-w-sm text-sm text-ink-400">{body}</p> : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "gold";
}) {
  return (
    <div className="surface rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.65rem] uppercase tracking-wider text-ink-400">{label}</p>
        {Icon ? <Icon className="size-4 shrink-0 text-gold-600" /> : null}
      </div>
      <p
        className={cn(
          "mt-3 font-display text-3xl tabular-nums",
          tone === "gold" ? "text-gradient-gold" : "text-ink-100",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}
