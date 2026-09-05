"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCog, Ban, CheckCircle2, Mail, Save, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/field";
import { useI18n } from "@/i18n/client";
import {
  assignDriver,
  setBookingStatus,
  updateBooking,
  contactClientAboutBooking,
} from "@/app/actions/admin";
import type { Booking, BookingStatus } from "@/db/schema";

export type AssignableDriver = {
  id: string;
  name: string | null;
  email: string | null;
  companyName: string;
};

/** Turns a Date into the value an <input type="datetime-local"> expects. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export function BookingAdminPanel({
  booking,
  drivers,
}: {
  booking: Booking;
  drivers: AssignableDriver[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  const [driverId, setDriverId] = useState(booking.driverId ?? "");
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [reason, setReason] = useState("");

  const [scheduledAt, setScheduledAt] = useState(toLocalInput(booking.scheduledAt));
  const [passengers, setPassengers] = useState(booking.passengers);
  const [luggage, setLuggage] = useState(booking.luggage);
  const [flightNumber, setFlightNumber] = useState(booking.flightNumber ?? "");
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [contactName, setContactName] = useState(booking.contactName);
  const [contactEmail, setContactEmail] = useState(booking.contactEmail);
  const [contactPhone, setContactPhone] = useState(booking.contactPhone);
  const [priceEuros, setPriceEuros] = useState((booking.priceTtcCents / 100).toFixed(2));

  const [messageSubject, setMessageSubject] = useState(`Réservation ${booking.reference}`);
  const [messageBody, setMessageBody] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, successMessage: string) {
    start(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.errorTitle);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Driver assignment */}
      <Card className="p-6">
        <h3 className="flex items-center gap-2 eyebrow">
          <UserCog className="size-3.5" aria-hidden />
          {t.admin.assignDriver}
        </h3>

        <div className="mt-4 space-y-3">
          <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">— {t.status.unassigned} —</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name ?? driver.email} · {driver.companyName}
              </option>
            ))}
          </Select>

          {drivers.length === 0 ? (
            <p className="text-xs text-ink-400">{t.common.noResults}</p>
          ) : null}

          <Button
            size="sm"
            className="w-full"
            disabled={pending || driverId === (booking.driverId ?? "")}
            onClick={() =>
              run(
                () => assignDriver(booking.id, driverId || null),
                driverId ? t.admin.saved : t.admin.unassignDriver,
              )
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            {t.common.save}
          </Button>
        </div>
      </Card>

      {/* Status */}
      <Card className="p-6">
        <h3 className="eyebrow">{t.admin.forceStatus}</h3>

        <div className="mt-4 space-y-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
            {(["pending", "confirmed", "completed", "cancelled"] as const).map((value) => (
              <option key={value} value={value}>
                {t.status[value]}
              </option>
            ))}
          </Select>

          {status === "cancelled" ? (
            <Input
              placeholder={t.admin.cancellationReason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          ) : null}

          <Button
            size="sm"
            variant={status === "cancelled" ? "danger" : "primary"}
            className="w-full"
            disabled={pending || status === booking.status}
            onClick={() =>
              run(() => setBookingStatus(booking.id, status, reason || undefined), t.admin.saved)
            }
          >
            {status === "cancelled" ? <Ban /> : <CheckCircle2 />}
            {status === "cancelled" ? t.admin.cancelRide : t.common.confirm}
          </Button>
        </div>
      </Card>

      {/* Contact the client */}
      <Card className="p-6">
        <h3 className="flex items-center gap-2 eyebrow">
          <Mail className="size-3.5" aria-hidden />
          {t.admin.contactClient}
        </h3>

        <div className="mt-4 space-y-3">
          <Input value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} />
          <Textarea
            rows={4}
            placeholder={t.contact.message}
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
          />
          <Button
            size="sm"
            variant="subtle"
            className="w-full"
            disabled={pending || messageBody.trim().length < 5}
            onClick={() =>
              run(
                async () => {
                  const result = await contactClientAboutBooking(
                    booking.id,
                    messageSubject,
                    messageBody,
                  );
                  if (result.ok) setMessageBody("");
                  return result;
                },
                t.contact.success,
              )
            }
          >
            <Mail />
            {t.contact.send}
          </Button>
        </div>
      </Card>

      {/* Edit the ride */}
      <Card className="p-6">
        <h3 className="eyebrow">{t.admin.editBooking}</h3>

        <div className="mt-4 space-y-3">
          <FormField label={t.booking.datetime}>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.common.passengers}>
              <Input
                type="number"
                min={1}
                max={8}
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
              />
            </FormField>
            <FormField label={t.common.luggage}>
              <Input
                type="number"
                min={0}
                max={12}
                value={luggage}
                onChange={(e) => setLuggage(Number(e.target.value))}
              />
            </FormField>
          </div>

          <FormField label={t.booking.flightNumber}>
            <Input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} />
          </FormField>

          <FormField label={t.booking.contactName}>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </FormField>
          <FormField label={t.booking.contactEmail}>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </FormField>
          <FormField label={t.booking.contactPhone}>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </FormField>

          <FormField
            label={`${t.common.total} ${t.common.tvac} (€)`}
            hint={t.common.optional}
          >
            <Input
              type="number"
              step="0.01"
              min={0}
              value={priceEuros}
              onChange={(e) => setPriceEuros(e.target.value)}
            />
          </FormField>

          <FormField label={t.booking.notes}>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>

          <Button
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  updateBooking(booking.id, {
                    scheduledAt: new Date(scheduledAt).toISOString(),
                    passengers,
                    luggage,
                    flightNumber,
                    notes,
                    contactName,
                    contactEmail,
                    contactPhone,
                    priceTtcCents: Math.round(Number(priceEuros) * 100),
                  }),
                t.admin.saved,
              )
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {t.common.save}
          </Button>
        </div>
      </Card>
    </div>
  );
}
