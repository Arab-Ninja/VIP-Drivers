import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a Date for display in the visitor's language, Brussels time. */
export function formatDateTime(date: Date | string, locale: string = "fr-BE"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Brussels",
  }).format(d);
}

export function formatDate(date: Date | string, locale: string = "fr-BE"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "Europe/Brussels",
  }).format(d);
}

/** Metres to a short, human distance: 14200 -> "14,2 km". */
export function formatDistance(meters: number, locale: string = "fr-BE"): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(meters / 1000)} km`;
}

/** Seconds to "1 h 25" / "45 min". */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

/**
 * Booking references are shown to clients and read out over the phone, so the
 * alphabet excludes characters that are easily confused when spoken or typed
 * (I/1, O/0, U/V).
 */
const REFERENCE_ALPHABET = "23456789ACDEFGHJKLMNPQRSTWXYZ";

export function generateReference(): string {
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length];
  return `VIP-${out}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
