import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent("/admin")}`);
  // A non-admin is bounced to their own area rather than shown a 403 page.
  if (user.role !== "admin") redirect(user.role === "driver" ? "/driver" : "/account");
  return <>{children}</>;
}
