"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n/client";

export function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; phone: string; role: string };
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateProfile({ name, phone });
      if (result.ok) {
        toast.success(t.account.profileUpdated);
        // Refresh so the header picks up the new name straight away.
        router.refresh();
      } else {
        toast.error(t.common.errorTitle);
      }
    });
  }

  return (
    <Card className="max-w-xl p-6 lg:p-8">
      <form onSubmit={onSubmit} className="space-y-5">
        <FormField label={t.auth.name} htmlFor="name">
          <Input
            id="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </FormField>

        <FormField label={t.auth.email} htmlFor="email">
          <Input id="email" value={initial.email} disabled readOnly />
        </FormField>

        <FormField label={t.auth.phone} htmlFor="phone">
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+32 4.. .. .. .."
          />
        </FormField>

        <Button type="submit" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </form>
    </Card>
  );
}
