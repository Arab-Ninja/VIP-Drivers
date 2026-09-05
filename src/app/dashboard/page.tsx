import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/**
 * Post-sign-in landing. Sign-in cannot know the account's role before the
 * session exists, so it always returns here and this decides where the person
 * actually belongs.
 */
export default async function DashboardRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "admin") redirect("/admin");
  if (user.role === "driver") redirect("/driver");
  redirect("/account");
}
