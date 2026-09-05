"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Save } from "lucide-react";

import { submitDriverApplication } from "@/app/actions/driver";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField, Input, Textarea } from "@/components/ui/field";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type DriverProfileValues = {
  companyName: string;
  displayName: string;
  bio: string;
  phone: string;
  languages: string[];
  yearsExperience: string;
  carMake: string;
  carModel: string;
  carYear: string;
  carColor: string;
  licensePlate: string;
  vatNumber: string;
  licenseNumber: string;
  iban: string;
  photoUrl: string;
};

const LANGUAGE_CHOICES = ["Français", "Nederlands", "English", "Deutsch", "Español", "Italiano", "العربية"];

export function DriverProfileForm({
  initial,
  mode,
}: {
  initial: DriverProfileValues;
  mode: "apply" | "edit";
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [values, setValues] = useState(initial);

  function set<K extends keyof DriverProfileValues>(key: K, value: DriverProfileValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleLanguage(language: string) {
    setValues((v) => ({
      ...v,
      languages: v.languages.includes(language)
        ? v.languages.filter((l) => l !== language)
        : [...v.languages, language],
    }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start(async () => {
      const result = await submitDriverApplication({
        ...values,
        yearsExperience: values.yearsExperience ? Number(values.yearsExperience) : undefined,
        carYear: values.carYear ? Number(values.carYear) : undefined,
      });

      if (!result.ok) {
        toast.error(t.common.errorTitle);
        return;
      }

      toast.success(mode === "apply" ? t.driver.applicationSent : t.driver.profileSaved);
      // A first application changes the account's role, so the whole tree
      // needs re-rendering for the driver area to appear in the header.
      router.refresh();
      if (mode === "apply") router.push("/driver");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-6 lg:p-8">
        <h2 className="eyebrow">{t.driver.profile}</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormField label={t.driver.companyName} htmlFor="companyName" className="sm:col-span-2">
            <Input
              id="companyName"
              required
              minLength={2}
              value={values.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="Ma Société de Transport SRL"
            />
          </FormField>

          <FormField label={t.driver.displayName} hint={t.common.optional} htmlFor="displayName">
            <Input
              id="displayName"
              value={values.displayName}
              onChange={(e) => set("displayName", e.target.value)}
              placeholder="Marc L."
            />
          </FormField>

          <FormField label={t.auth.phone} htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              required
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+32 4.. .. .. .."
            />
          </FormField>

          <FormField
            label={t.driver.bio}
            hint={t.driver.bioHint}
            htmlFor="bio"
            className="sm:col-span-2"
          >
            <Textarea
              id="bio"
              rows={4}
              value={values.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          </FormField>

          <FormField label={t.driver.yearsExperience} hint={t.common.optional} htmlFor="yearsExperience">
            <Input
              id="yearsExperience"
              type="number"
              min={0}
              max={60}
              value={values.yearsExperience}
              onChange={(e) => set("yearsExperience", e.target.value)}
            />
          </FormField>

          <FormField label="Photo (URL)" hint={t.common.optional} htmlFor="photoUrl">
            <Input
              id="photoUrl"
              type="url"
              value={values.photoUrl}
              onChange={(e) => set("photoUrl", e.target.value)}
              placeholder="https://…"
            />
          </FormField>

          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-medium text-ink-200">{t.driver.languagesSpoken}</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_CHOICES.map((language) => {
                const active = values.languages.includes(language);
                return (
                  <button
                    key={language}
                    type="button"
                    onClick={() => toggleLanguage(language)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      active
                        ? "border-gold-500/70 bg-gold-500/12 text-gold-200"
                        : "border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600",
                    )}
                  >
                    {language}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 lg:p-8">
        <h2 className="eyebrow">{t.common.vehicle}</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormField label={t.driver.carMake} htmlFor="carMake">
            <Input
              id="carMake"
              value={values.carMake}
              onChange={(e) => set("carMake", e.target.value)}
              placeholder="Mercedes-Benz"
            />
          </FormField>
          <FormField label={t.driver.carModel} htmlFor="carModel">
            <Input
              id="carModel"
              value={values.carModel}
              onChange={(e) => set("carModel", e.target.value)}
              placeholder="Classe E"
            />
          </FormField>
          <FormField label={t.driver.carYear} htmlFor="carYear">
            <Input
              id="carYear"
              type="number"
              min={1990}
              max={2100}
              value={values.carYear}
              onChange={(e) => set("carYear", e.target.value)}
              placeholder="2026"
            />
          </FormField>
          <FormField label={t.driver.carColor} htmlFor="carColor">
            <Input
              id="carColor"
              value={values.carColor}
              onChange={(e) => set("carColor", e.target.value)}
              placeholder="Noir obsidienne"
            />
          </FormField>
          <FormField label={t.driver.licensePlate} htmlFor="licensePlate">
            <Input
              id="licensePlate"
              value={values.licensePlate}
              onChange={(e) => set("licensePlate", e.target.value.toUpperCase())}
              placeholder="1-ABC-123"
            />
          </FormField>
        </div>
      </Card>

      <Card className="p-6 lg:p-8">
        <h2 className="eyebrow">{t.about.companyDetails}</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormField label={t.driver.vatNumber} hint={t.common.optional} htmlFor="vatNumber">
            <Input
              id="vatNumber"
              value={values.vatNumber}
              onChange={(e) => set("vatNumber", e.target.value)}
              placeholder="BE 0700.000.000"
            />
          </FormField>
          <FormField label={t.driver.licenseNumber} hint={t.common.optional} htmlFor="licenseNumber">
            <Input
              id="licenseNumber"
              value={values.licenseNumber}
              onChange={(e) => set("licenseNumber", e.target.value)}
            />
          </FormField>
          <FormField
            label={t.driver.iban}
            hint={t.common.optional}
            htmlFor="iban"
            className="sm:col-span-2"
          >
            <Input
              id="iban"
              value={values.iban}
              onChange={(e) => set("iban", e.target.value.toUpperCase())}
              placeholder="BE00 0000 0000 0000"
            />
          </FormField>
        </div>
      </Card>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? null : mode === "apply" ? <Send /> : <Save />}
        {pending
          ? t.common.saving
          : mode === "apply"
            ? t.driver.submitApplication
            : t.common.save}
      </Button>
    </form>
  );
}
