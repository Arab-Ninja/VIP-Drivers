import Link from "next/link";

import { getTranslations } from "@/i18n";
import { Container } from "@/components/site/Section";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const { t } = await getTranslations();

  return (
    <Container className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-7xl text-gradient-gold">404</p>
      <div className="mt-8 h-px w-16 bg-gold-500/70" aria-hidden />
      <h1 className="mt-8 font-display text-3xl text-ink-100">{t.errors.notFound}</h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-300">{t.errors.notFoundBody}</p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">{t.errors.goHome}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/booking">{t.common.bookNow}</Link>
        </Button>
      </div>
    </Container>
  );
}
