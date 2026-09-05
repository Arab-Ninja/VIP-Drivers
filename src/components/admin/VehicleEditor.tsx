"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Save, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/client";
import { upsertVehicle, deleteVehicle } from "@/app/actions/admin";
import { formatCents } from "@/lib/pricing";
import type { VehicleCategory } from "@/db/schema";

type Draft = {
  slug: string;
  name: string;
  year: string;
  descriptionFr: string;
  descriptionEn: string;
  pricePerKm: string;
  pricePerHour: string;
  minimumPrice: string;
  passengerCapacity: string;
  luggageCapacity: string;
  imageUrls: string;
  featuresFr: string;
  featuresEn: string;
  isActive: boolean;
  sortOrder: string;
};

function toDraft(vehicle: VehicleCategory): Draft {
  return {
    slug: vehicle.slug,
    name: vehicle.name,
    year: String(vehicle.year),
    descriptionFr: vehicle.descriptionFr,
    descriptionEn: vehicle.descriptionEn,
    pricePerKm: (vehicle.pricePerKmCents / 100).toFixed(2),
    pricePerHour: (vehicle.pricePerHourCents / 100).toFixed(2),
    minimumPrice: (vehicle.minimumPriceCents / 100).toFixed(2),
    passengerCapacity: String(vehicle.passengerCapacity),
    luggageCapacity: String(vehicle.luggageCapacity),
    imageUrls: vehicle.imageUrls.join("\n"),
    featuresFr: vehicle.featuresFr.join("\n"),
    featuresEn: vehicle.featuresEn.join("\n"),
    isActive: vehicle.isActive,
    sortOrder: String(vehicle.sortOrder),
  };
}

const EMPTY_DRAFT: Draft = {
  slug: "",
  name: "",
  year: "2026",
  descriptionFr: "",
  descriptionEn: "",
  pricePerKm: "3.00",
  pricePerHour: "80.00",
  minimumPrice: "80.00",
  passengerCapacity: "3",
  luggageCapacity: "3",
  imageUrls: "",
  featuresFr: "",
  featuresEn: "",
  isActive: true,
  sortOrder: "0",
};

/** Splits a textarea into trimmed, non-empty lines. */
function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function euros(value: string): number {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

function VehicleForm({
  vehicle,
  onDone,
  onCancel,
}: {
  vehicle: VehicleCategory | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft>(vehicle ? toDraft(vehicle) : EMPTY_DRAFT);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start(async () => {
      const result = await upsertVehicle(vehicle?.id ?? null, {
        slug: draft.slug.trim().toLowerCase(),
        name: draft.name.trim(),
        year: Number(draft.year),
        descriptionFr: draft.descriptionFr,
        descriptionEn: draft.descriptionEn,
        pricePerKmCents: euros(draft.pricePerKm),
        pricePerHourCents: euros(draft.pricePerHour),
        minimumPriceCents: euros(draft.minimumPrice),
        passengerCapacity: Number(draft.passengerCapacity),
        luggageCapacity: Number(draft.luggageCapacity),
        imageUrls: lines(draft.imageUrls),
        featuresFr: lines(draft.featuresFr),
        featuresEn: lines(draft.featuresEn),
        isActive: draft.isActive,
        sortOrder: Number(draft.sortOrder),
      });

      if (result.ok) {
        toast.success(t.admin.saved);
        router.refresh();
        onDone();
      } else {
        toast.error(result.error ?? t.common.errorTitle);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t.common.vehicle}>
          <Input required value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label="Slug" hint="a-z, 0-9, tirets">
          <Input
            required
            pattern="[a-z0-9-]+"
            value={draft.slug}
            onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          />
        </FormField>
        <FormField label={t.driver.carYear}>
          <Input
            type="number"
            min={1990}
            max={2100}
            value={draft.year}
            onChange={(e) => set("year", e.target.value)}
          />
        </FormField>
        <FormField label="Ordre d'affichage">
          <Input
            type="number"
            min={0}
            value={draft.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label={`${t.fleet.transferRate} (€/km)`}>
          <Input
            type="number"
            step="0.01"
            min={0}
            required
            value={draft.pricePerKm}
            onChange={(e) => set("pricePerKm", e.target.value)}
          />
        </FormField>
        <FormField label={`${t.fleet.disposalRate} (€/h)`}>
          <Input
            type="number"
            step="0.01"
            min={0}
            required
            value={draft.pricePerHour}
            onChange={(e) => set("pricePerHour", e.target.value)}
          />
        </FormField>
        <FormField label={`${t.fleet.minimumRide} (€)`}>
          <Input
            type="number"
            step="0.01"
            min={0}
            required
            value={draft.minimumPrice}
            onChange={(e) => set("minimumPrice", e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t.common.passengers}>
          <Input
            type="number"
            min={1}
            max={20}
            value={draft.passengerCapacity}
            onChange={(e) => set("passengerCapacity", e.target.value)}
          />
        </FormField>
        <FormField label={t.common.luggage}>
          <Input
            type="number"
            min={0}
            max={30}
            value={draft.luggageCapacity}
            onChange={(e) => set("luggageCapacity", e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Description (FR)">
        <Textarea
          rows={3}
          value={draft.descriptionFr}
          onChange={(e) => set("descriptionFr", e.target.value)}
        />
      </FormField>
      <FormField label="Description (EN)">
        <Textarea
          rows={3}
          value={draft.descriptionEn}
          onChange={(e) => set("descriptionEn", e.target.value)}
        />
      </FormField>

      <FormField label={t.admin.imageUrls}>
        <Textarea
          rows={3}
          value={draft.imageUrls}
          onChange={(e) => set("imageUrls", e.target.value)}
          placeholder="/fleet/classe-e.svg"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={`${t.admin.features} (FR)`}>
          <Textarea
            rows={5}
            value={draft.featuresFr}
            onChange={(e) => set("featuresFr", e.target.value)}
          />
        </FormField>
        <FormField label={`${t.admin.features} (EN)`}>
          <Textarea
            rows={5}
            value={draft.featuresEn}
            onChange={(e) => set("featuresEn", e.target.value)}
          />
        </FormField>
      </div>

      <label className="flex items-center gap-3 text-sm text-ink-200">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
          className="size-4 accent-[#b8933e]"
        />
        {t.admin.vehicleActive}
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {t.common.save}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function VehicleEditor({ vehicles }: { vehicles: VehicleCategory[] }) {
  const { t, intl } = useI18n();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, start] = useTransition();

  function onDelete(vehicle: VehicleCategory) {
    if (!window.confirm(t.admin.confirmDelete)) return;
    start(async () => {
      const result = await deleteVehicle(vehicle.id);
      if (result.ok) {
        toast.success(
          result.hidden
            ? "Véhicule masqué : des réservations y font référence."
            : t.admin.saved,
        );
        router.refresh();
      } else {
        toast.error(t.common.errorTitle);
      }
    });
  }

  return (
    <div className="space-y-4">
      {creating ? (
        <Card className="p-6">
          <h3 className="eyebrow">{t.admin.addVehicle}</h3>
          <div className="mt-5">
            <VehicleForm
              vehicle={null}
              onDone={() => setCreating(false)}
              onCancel={() => setCreating(false)}
            />
          </div>
        </Card>
      ) : (
        <Button onClick={() => setCreating(true)}>
          <Plus />
          {t.admin.addVehicle}
        </Button>
      )}

      {vehicles.map((vehicle) => (
        <Card key={vehicle.id} className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {vehicle.imageUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vehicle.imageUrls[0]} alt="" className="h-12 w-24 object-contain" />
              ) : null}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base text-ink-100">{vehicle.name}</h3>
                  <Badge tone={vehicle.isActive ? "success" : "neutral"}>
                    {vehicle.isActive ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                    {vehicle.isActive ? t.admin.vehicleActive : t.common.no}
                  </Badge>
                  <Badge tone="neutral">{vehicle.year}</Badge>
                </div>
                <p className="mt-1.5 text-xs text-ink-400">
                  {formatCents(vehicle.pricePerKmCents, intl)}/{t.common.km} ·{" "}
                  {formatCents(vehicle.pricePerHourCents, intl)}/{t.common.hour.charAt(0)} ·{" "}
                  {t.common.minimum} {formatCents(vehicle.minimumPriceCents, intl)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="subtle"
                onClick={() => setEditingId(editingId === vehicle.id ? null : vehicle.id)}
              >
                {editingId === vehicle.id ? t.common.close : t.common.edit}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => onDelete(vehicle)}
                aria-label={t.common.delete}
              >
                <Trash2 />
              </Button>
            </div>
          </div>

          {editingId === vehicle.id ? (
            <div className="mt-6 border-t border-ink-800 pt-6">
              <VehicleForm
                vehicle={vehicle}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
