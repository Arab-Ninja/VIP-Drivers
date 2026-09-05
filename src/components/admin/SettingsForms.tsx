"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/field";
import { useI18n } from "@/i18n/client";
import {
  saveCompanyInfo,
  savePricingRules,
  saveOperationalSettings,
} from "@/app/actions/admin";
import type { CompanyInfo, OperationalSettings } from "@/lib/settings";
import type { PricingRules } from "@/lib/pricing";

function useSaver() {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function save(action: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(t.admin.saved);
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.errorTitle);
      }
    });
  }

  return { pending, save };
}

export function CompanyInfoForm({ initial }: { initial: CompanyInfo }) {
  const { t } = useI18n();
  const { pending, save } = useSaver();
  const [values, setValues] = useState(initial);

  function set<K extends keyof CompanyInfo>(key: K, value: CompanyInfo[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const textFields: { key: keyof CompanyInfo; label: string; type?: string }[] = [
    { key: "legalName", label: "Raison sociale" },
    { key: "tradingName", label: "Nom commercial" },
    { key: "addressLine1", label: "Adresse" },
    { key: "addressLine2", label: "Complément d'adresse" },
    { key: "postalCode", label: "Code postal" },
    { key: "city", label: "Ville" },
    { key: "country", label: "Pays" },
    { key: "phone", label: t.contact.phone, type: "tel" },
    { key: "email", label: t.contact.email, type: "email" },
    { key: "vatNumber", label: t.footer.vatLabel },
    { key: "companyNumber", label: "Numéro d'entreprise" },
    { key: "instagramUrl", label: "Instagram", type: "url" },
    { key: "linkedinUrl", label: "LinkedIn", type: "url" },
    { key: "facebookUrl", label: "Facebook", type: "url" },
  ];

  const longFields: { key: keyof CompanyInfo; label: string }[] = [
    { key: "storyFr", label: "Présentation (FR)" },
    { key: "storyEn", label: "Présentation (EN)" },
    { key: "coverageFr", label: "Zone de couverture (FR)" },
    { key: "coverageEn", label: "Zone de couverture (EN)" },
    { key: "hoursFr", label: "Disponibilité (FR)" },
    { key: "hoursEn", label: "Disponibilité (EN)" },
  ];

  return (
    <Card className="p-6 lg:p-8">
      <h2 className="eyebrow">{t.admin.companyInfo}</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {textFields.map((field) => (
          <FormField key={field.key} label={field.label}>
            <Input
              type={field.type ?? "text"}
              value={values[field.key] as string}
              onChange={(e) => set(field.key, e.target.value as CompanyInfo[typeof field.key])}
            />
          </FormField>
        ))}
      </div>

      <div className="mt-4 grid gap-4">
        {longFields.map((field) => (
          <FormField key={field.key} label={field.label}>
            <Textarea
              rows={3}
              value={values[field.key] as string}
              onChange={(e) => set(field.key, e.target.value as CompanyInfo[typeof field.key])}
            />
          </FormField>
        ))}
      </div>

      <Button className="mt-6" disabled={pending} onClick={() => save(() => saveCompanyInfo(values))}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />}
        {t.common.save}
      </Button>
    </Card>
  );
}

export function PricingRulesForm({ initial }: { initial: PricingRules }) {
  const { t } = useI18n();
  const { pending, save } = useSaver();
  const [values, setValues] = useState(initial);

  function set<K extends keyof PricingRules>(key: K, value: number) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <Card className="p-6 lg:p-8">
      <h2 className="eyebrow">{t.admin.pricingRules}</h2>
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-400">
        Les suppléments s'appliquent sur le prix de base, après application du minimum par trajet.
        À 0 %, aucun supplément n'est ajouté et le prix affiché est exactement le tarif x la
        distance ou la durée.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label={t.admin.vatRate}>
          <Input
            type="number"
            step="0.1"
            min={0}
            max={50}
            value={values.vatBps / 100}
            onChange={(e) => set("vatBps", Math.round(Number(e.target.value) * 100))}
          />
        </FormField>

        <FormField label={t.admin.nightSurcharge}>
          <Input
            type="number"
            step="1"
            min={0}
            max={200}
            value={values.nightSurchargeBps / 100}
            onChange={(e) => set("nightSurchargeBps", Math.round(Number(e.target.value) * 100))}
          />
        </FormField>

        <FormField label={t.admin.weekendSurcharge}>
          <Input
            type="number"
            step="1"
            min={0}
            max={200}
            value={values.weekendSurchargeBps / 100}
            onChange={(e) => set("weekendSurchargeBps", Math.round(Number(e.target.value) * 100))}
          />
        </FormField>

        <FormField label={`${t.admin.nightWindow} — début`}>
          <Input
            type="number"
            min={0}
            max={23}
            value={values.nightStartHour}
            onChange={(e) => set("nightStartHour", Number(e.target.value))}
          />
        </FormField>

        <FormField label={`${t.admin.nightWindow} — fin`}>
          <Input
            type="number"
            min={0}
            max={23}
            value={values.nightEndHour}
            onChange={(e) => set("nightEndHour", Number(e.target.value))}
          />
        </FormField>

        <FormField label={t.admin.stopFee}>
          <Input
            type="number"
            step="0.5"
            min={0}
            value={values.stopFeeCents / 100}
            onChange={(e) => set("stopFeeCents", Math.round(Number(e.target.value) * 100))}
          />
        </FormField>
      </div>

      <Button
        className="mt-6"
        disabled={pending}
        onClick={() => save(() => savePricingRules(values))}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Save />}
        {t.common.save}
      </Button>
    </Card>
  );
}

export function OperationsForm({ initial }: { initial: OperationalSettings }) {
  const { t } = useI18n();
  const { pending, save } = useSaver();
  const [values, setValues] = useState(initial);

  function set<K extends keyof OperationalSettings>(key: K, value: number) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  return (
    <Card className="p-6 lg:p-8">
      <h2 className="eyebrow">{t.admin.settings}</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label={t.admin.defaultCommission}>
          <Input
            type="number"
            step="0.5"
            min={0}
            max={50}
            value={values.defaultCommissionBps / 100}
            onChange={(e) => set("defaultCommissionBps", Math.round(Number(e.target.value) * 100))}
          />
        </FormField>

        <FormField label="Délai minimum avant prise en charge (h)">
          <Input
            type="number"
            min={0}
            max={72}
            value={values.minimumLeadTimeHours}
            onChange={(e) => set("minimumLeadTimeHours", Number(e.target.value))}
          />
        </FormField>

        <FormField label="Arrêts intermédiaires maximum">
          <Input
            type="number"
            min={0}
            max={10}
            value={values.maxStops}
            onChange={(e) => set("maxStops", Number(e.target.value))}
          />
        </FormField>

        <FormField label="Mise à disposition — durée min (h)">
          <Input
            type="number"
            min={1}
            max={24}
            value={values.minDisposalHours}
            onChange={(e) => set("minDisposalHours", Number(e.target.value))}
          />
        </FormField>

        <FormField label="Mise à disposition — durée max (h)">
          <Input
            type="number"
            min={1}
            max={24}
            value={values.maxDisposalHours}
            onChange={(e) => set("maxDisposalHours", Number(e.target.value))}
          />
        </FormField>
      </div>

      <Button
        className="mt-6"
        disabled={pending}
        onClick={() => save(() => saveOperationalSettings(values))}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Save />}
        {t.common.save}
      </Button>
    </Card>
  );
}
