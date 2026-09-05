import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * The driver area is reachable by drivers and admins. Anyone else is sent to
 * the partner application rather than a dead end, since that is what they
 * would need to do to get in.
 */
export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent("/driver")}`);
  return <>{children}</>;
}
