"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";

import { submitContactMessage } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea, Select } from "@/components/ui/field";
import { useI18n } from "@/i18n/client";

export function ContactForm({ defaultEmail, defaultName }: { defaultEmail?: string; defaultName?: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await submitContactMessage(data);
      if (result.ok) {
        toast.success(t.contact.success);
        form.reset();
        setDone(true);
      } else {
        toast.error(t.contact.error);
      }
    });
  }

  if (done) {
    return (
      <div className="surface rounded-lg p-8 text-center">
        <p className="text-sm text-ink-100">{t.contact.success}</p>
        <Button variant="outline" size="sm" className="mt-6" onClick={() => setDone(false)}>
          {t.contact.send}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface rounded-lg p-6 lg:p-8">
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute size-0 opacity-0"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={t.contact.name} htmlFor="name">
          <Input id="name" name="name" required minLength={2} defaultValue={defaultName} autoComplete="name" />
        </FormField>
        <FormField label={t.contact.email} htmlFor="email">
          <Input id="email" name="email" type="email" required defaultValue={defaultEmail} autoComplete="email" />
        </FormField>
        <FormField label={t.contact.phone} hint={t.common.optional} htmlFor="phone">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+32 4.. .. .. .." />
        </FormField>
        <FormField label={t.contact.subject} htmlFor="subject">
          <Select id="subject" name="subject" required defaultValue={t.contact.subjectOptions.quote}>
            {Object.values(t.contact.subjectOptions).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label={t.contact.message} htmlFor="message" className="mt-5">
        <Textarea id="message" name="message" required minLength={10} rows={6} />
      </FormField>

      <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={pending}>
        {pending ? t.contact.sending : t.contact.send}
        {!pending ? <Send /> : null}
      </Button>
    </form>
  );
}
