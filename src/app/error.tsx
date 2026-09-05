"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  // This boundary can render before the i18n provider is available, so its
  // copy is bilingual rather than translated.
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-lg flex-col items-center justify-center px-5 py-24 text-center">
      <span className="grid size-12 place-items-center border border-danger/40 bg-danger/8 text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </span>

      <h1 className="mt-8 font-display text-3xl text-ink-100">Une erreur est survenue</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-300">
        Notre équipe en a été informée. Réessayez dans un instant.
        <span className="mt-1 block text-ink-500">
          Something went wrong. Our team has been notified.
        </span>
      </p>

      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-ink-600">{error.digest}</p>
      ) : null}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>Réessayer</Button>
        <Button asChild variant="outline">
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </div>
  );
}
