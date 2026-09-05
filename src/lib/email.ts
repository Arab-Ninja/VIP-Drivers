import { env } from "@/lib/env";

/**
 * Transactional email.
 *
 * Email is optional infrastructure here: bookings and messages are always
 * persisted first, and the admin panel is the source of truth. When no
 * provider is configured every send becomes a no-op that logs what it would
 * have sent, so the app runs identically with or without credentials.
 */

type SendArgs = {
  to: string | string[];
  subject: string;
  /** Plain-text body, one array entry per line. */
  lines: string[];
};

export async function sendEmail({ to, subject, lines }: SendArgs): Promise<boolean> {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return false;

  const text = lines.join("\n");

  if (!env.email.enabled) {
    console.info(`[email:skipped] to=${recipients.join(",")} subject="${subject}"\n${text}\n`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.email.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: env.email.from, to: recipients, subject, text }),
    });

    if (!response.ok) {
      console.error(`[email:failed] ${response.status} ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email:error]", error);
    return false;
  }
}

/** Notifies the operations inbox, when one is configured. */
export function sendOperationsEmail(args: Omit<SendArgs, "to">): Promise<boolean> {
  if (!env.email.operations) return Promise.resolve(false);
  return sendEmail({ ...args, to: env.email.operations });
}
