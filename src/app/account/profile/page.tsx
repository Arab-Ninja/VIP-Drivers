import type { Metadata } from "next";
import { CalendarClock, User } from "lucide-react";

import { getTranslations } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { ProfileForm } from "@/components/site/ProfileForm";
import { NotificationToggle } from "@/components/NotificationToggle";

export const metadata: Metadata = { title: "Profil", robots: { index: false } };

export default async function AccountProfilePage() {
  const user = await requireUser();
  const { t } = await getTranslations();

  return (
    <DashboardShell
      title={t.account.profile}
      activeHref="/account/profile"
      tabs={[
        { href: "/account", label: t.account.myBookings, icon: CalendarClock },
        { href: "/account/profile", label: t.account.profile, icon: User },
      ]}
    >
      <div className="space-y-6">
        <ProfileForm
          initial={{
            name: user.name ?? "",
            email: user.email ?? "",
            phone: user.phone ?? "",
            role: user.role,
          }}
        />
        <NotificationToggle />
      </div>
    </DashboardShell>
  );
}
