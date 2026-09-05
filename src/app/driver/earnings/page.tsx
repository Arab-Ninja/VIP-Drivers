import type { Metadata } from "next";
import { Wallet, TrendingUp, Car, Percent, Clock, Receipt } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { getDriverEarnings, getDriverProfile } from "@/server/drivers";
import { DashboardShell, StatTile } from "@/components/DashboardShell";
import { driverTabs } from "@/components/driver/DriverTabs";
import { EarningsChart } from "@/components/driver/EarningsChart";
import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/pricing";

export const metadata: Metadata = { title: "Revenus", robots: { index: false } };

export default async function DriverEarningsPage() {
  const user = await requireUser();
  const { t } = await getTranslations();
  const intl = t.meta.intl;

  const [earnings, profile] = await Promise.all([
    getDriverEarnings(user.id),
    getDriverProfile(user.id),
  ]);

  const commissionPct = ((profile?.commissionBps ?? 2000) / 100).toFixed(0);

  return (
    <DashboardShell
      title={t.driver.earnings}
      activeHref="/driver/earnings"
      tabs={driverTabs(t)}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t.driver.totalEarnings}
          value={formatCents(earnings.netCents, intl)}
          hint={`${earnings.completedRides} ${t.driver.totalRides.toLowerCase()}`}
          icon={Wallet}
          tone="gold"
        />
        <StatTile
          label={t.driver.pendingEarnings}
          value={formatCents(earnings.pendingNetCents, intl)}
          hint={`${earnings.upcomingRides} ${t.driver.upcomingRides.toLowerCase()}`}
          icon={Clock}
        />
        <StatTile
          label={t.driver.averageFare}
          value={formatCents(earnings.averageFareCents, intl)}
          icon={TrendingUp}
        />
        <StatTile
          label={t.driver.commissionRate}
          value={`${commissionPct} %`}
          hint={formatCents(earnings.commissionCents, intl)}
          icon={Percent}
        />
      </div>

      <Card className="mt-6 p-6">
        <h2 className="eyebrow">{t.driver.lastMonths}</h2>
        <div className="mt-6">
          <EarningsChart data={earnings.monthly} />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="eyebrow">{t.common.details}</h2>
        <dl className="mt-5 divide-y divide-ink-700/70">
          {[
            {
              icon: Receipt,
              label: t.driver.grossFares,
              value: formatCents(earnings.grossHtvaCents, intl),
              hint: t.common.htva,
            },
            {
              icon: Percent,
              label: `${t.driver.commission} (${commissionPct} %)`,
              value: `− ${formatCents(earnings.commissionCents, intl)}`,
            },
            {
              icon: Wallet,
              label: t.driver.netEarning,
              value: formatCents(earnings.netCents, intl),
              strong: true,
            },
            {
              icon: Car,
              label: t.driver.totalRides,
              value: String(earnings.completedRides),
            },
          ].map((line) => (
            <div key={line.label} className="flex items-center justify-between gap-4 py-3.5">
              <dt className="flex items-center gap-3 text-sm text-ink-300">
                <line.icon className="size-4 text-gold-600" aria-hidden />
                {line.label}
                {line.hint ? <span className="text-xs text-ink-500">{line.hint}</span> : null}
              </dt>
              <dd
                className={
                  line.strong
                    ? "font-display text-xl text-gradient-gold tabular-nums"
                    : "text-sm text-ink-100 tabular-nums"
                }
              >
                {line.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </DashboardShell>
  );
}
