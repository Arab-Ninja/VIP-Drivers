import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium tracking-wide whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-ink-600 bg-ink-800 text-ink-200",
        gold: "border-gold-600/45 bg-gold-500/12 text-gold-200",
        success: "border-success/40 bg-success/12 text-[#7fd3a6]",
        warning: "border-warning/40 bg-warning/12 text-[#e8c377]",
        danger: "border-danger/40 bg-danger/12 text-[#e59a94]",
        info: "border-info/40 bg-info/12 text-[#9cc2e8]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
