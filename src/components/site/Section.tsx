import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 lg:px-8", className)}>{children}</div>;
}

export function Section({
  className,
  children,
  id,
}: {
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-20 lg:py-28", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="mt-4 text-3xl leading-tight text-ink-100 sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {subtitle ? <p className="mt-5 text-base leading-relaxed text-ink-300">{subtitle}</p> : null}
      <div
        className={cn("mt-7 h-px w-16 bg-gold-500/70", align === "center" && "mx-auto")}
        aria-hidden
      />
    </div>
  );
}
