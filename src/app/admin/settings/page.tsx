import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireRole } from "@/lib/auth";
import { getCompanyInfo, getPricingRules, getOperationalSettings } from "@/lib/settings";
import { countUnreadMessages } from "@/server/admin";
import { DashboardShell } from "@/components/DashboardShell";
import { adminTabs } from "@/components/admin/AdminTabs";
import {
  CompanyInfoForm,
  PricingRulesForm,
  OperationsForm,
} from "@/components/admin/SettingsForms";
import { Card } from "@/components/ui/card";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Paramètres", robots: { index: false } };

export default async function AdminSettingsPage() {
  await requireRole("admin");
  const { t } = await getTranslations();

  const [company, pricing, operations, unread] = await Promise.all([
    getCompanyInfo(),
    getPricingRules(),
    getOperationalSettings(),
    countUnreadMessages(),
  ]);

  // A quick read on which integrations this deployment actually has, so the
  // operator can see at a glance what is still to be connected.
  const integrations = [
    { name: "Google sign-in", on: env.google.enabled, hint: "AUTH_GOOGLE_ID" },
    {
      name: `Stripe${env.stripe.enabled && env.stripe.isTestMode ? " (test)" : ""}`,
      on: env.stripe.enabled,
      hint: "STRIPE_SECRET_KEY",
    },
    { name: "PayPal", on: env.paypal.enabled, hint: "PAYPAL_CLIENT_ID" },
    { name: "Mapbox", on: env.mapbox.enabled, hint: "MAPBOX_TOKEN (sinon OpenStreetMap)" },
    { name: "Notifications push", on: env.push.enabled, hint: "VAPID_PRIVATE_KEY" },
    { name: "E-mails", on: env.email.enabled, hint: "RESEND_API_KEY" },
  ];

  return (
    <DashboardShell
      title={t.admin.settings}
      activeHref="/admin/settings"
      tabs={adminTabs(t, { messages: unread || undefined })}
    >
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="eyebrow">Intégrations</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <li key={integration.name} className="flex items-start gap-3">
                {integration.on ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-ink-100">{integration.name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-500">{integration.hint}</p>
                </div>
              </li>
            ))}
          </ul>
          {env.stripe.enabled && env.stripe.isTestMode ? (
            <p className="mt-5 rounded-sm border border-warning/40 bg-warning/8 px-4 py-3 text-xs text-[#e8c377]">
              Stripe fonctionne en mode test : aucun paiement réel n'est encaissé. Remplacez les
              clés par vos clés live pour passer en production.
            </p>
          ) : null}
          {!env.stripe.enabled && env.demoPaymentsEnabled ? (
            <p className="mt-5 rounded-sm border border-warning/40 bg-warning/8 px-4 py-3 text-xs text-[#e8c377]">
              Mode démonstration actif : les réservations peuvent être confirmées sans paiement
              réel. Désactivez-le avec DEMO_PAYMENTS=false une fois Stripe configuré.
            </p>
          ) : null}
        </Card>

        <PricingRulesForm initial={pricing} />
        <OperationsForm initial={operations} />
        <CompanyInfoForm initial={company} />
      </div>
    </DashboardShell>
  );
}
