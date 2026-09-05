import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTranslations } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { getDriverProfile } from "@/server/drivers";
import { DashboardShell } from "@/components/DashboardShell";
import { driverTabs } from "@/components/driver/DriverTabs";
import { DriverProfileForm } from "@/components/driver/DriverProfileForm";
import { DriverStatusNotice, DriverApprovedBanner } from "@/components/driver/DriverStatusNotice";
import { NotificationToggle } from "@/components/NotificationToggle";

export const metadata: Metadata = { title: "Profil chauffeur", robots: { index: false } };

export default async function DriverProfilePage() {
  const user = await requireUser();
  const { t } = await getTranslations();
  const profile = await getDriverProfile(user.id);

  if (!profile) redirect("/driver/apply");

  return (
    <DashboardShell
      title={t.driver.profile}
      subtitle={profile.companyName}
      activeHref="/driver/profile"
      tabs={driverTabs(t)}
    >
      {profile.status === "approved" ? (
        <DriverApprovedBanner t={t} />
      ) : (
        <DriverStatusNotice status={profile.status} t={t} />
      )}

      <div className="max-w-3xl space-y-6">
        <DriverProfileForm
          mode="edit"
          initial={{
            companyName: profile.companyName,
            displayName: profile.displayName ?? "",
            bio: profile.bio ?? "",
            phone: user.phone ?? "",
            languages: profile.languages,
            yearsExperience: profile.yearsExperience?.toString() ?? "",
            carMake: profile.carMake ?? "",
            carModel: profile.carModel ?? "",
            carYear: profile.carYear?.toString() ?? "",
            carColor: profile.carColor ?? "",
            licensePlate: profile.licensePlate ?? "",
            vatNumber: profile.vatNumber ?? "",
            licenseNumber: profile.licenseNumber ?? "",
            iban: profile.iban ?? "",
            photoUrl: profile.photoUrl ?? "",
          }}
        />
        <NotificationToggle />
      </div>
    </DashboardShell>
  );
}
