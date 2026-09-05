import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/site/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect((await searchParams).callbackUrl ?? "/dashboard");

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-5 py-16">
      <Suspense>
        <AuthForm mode="login" googleEnabled={env.google.enabled} />
      </Suspense>
    </div>
  );
}
