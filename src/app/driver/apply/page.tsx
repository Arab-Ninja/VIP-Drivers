import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getTranslations } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { getDriverProfile } from "@/server/drivers";
import { Container, SectionHeading } from "@/components/site/Section";
import { DriverProfileForm } from "@/components/driver/DriverProfileForm";

export const metadata: Metadata = {
  title: "Devenir chauffeur partenaire",
  description:
    "Rejoignez le réseau de chauffeurs partenaires VIP Drivers à Bruxelles et recevez des courses régulières.",
};

export default async function DriverApplyPage() {
  const { t } = await getTranslations();
  const user = await getCurrentUser();

  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent("/driver/apply")}`);

  // Someone who already has a profile is editing it, not applying again.
  const profile = await getDriverProfile(user.id);
  if (profile) redirect("/driver/profile");

  return (
    <Container className="py-14 lg:py-20">
      <SectionHeading
        eyebrow={t.nav.becomeDriver}
        title={t.driver.signupTitle}
        subtitle={t.driver.signupSubtitle}
        align="left"
        className="mb-10"
      />

      <div className="max-w-3xl">
        <DriverProfileForm
          mode="apply"
          initial={{
            companyName: "",
            displayName: user.name ?? "",
            bio: "",
            phone: user.phone ?? "",
            languages: ["Français"],
            yearsExperience: "",
            carMake: "Mercedes-Benz",
            carModel: "",
            carYear: "2026",
            carColor: "",
            licensePlate: "",
            vatNumber: "",
            licenseNumber: "",
            iban: "",
            photoUrl: "",
          }}
        />
      </div>
    </Container>
  );
}
