import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 hover:from-gold-200 hover:to-gold-400 shadow-[0_10px_30px_-12px_rgba(200,164,93,0.6)] hover:shadow-[0_14px_38px_-12px_rgba(200,164,93,0.75)]",
        outline:
          "border border-gold-600/50 text-gold-200 hover:border-gold-400 hover:bg-gold-500/10 hover:text-gold-100",
        ghost: "text-ink-200 hover:bg-ink-800 hover:text-ink-100",
        subtle: "bg-ink-800 text-ink-100 border border-ink-700 hover:bg-ink-700 hover:border-ink-600",
        danger: "bg-danger/90 text-white hover:bg-danger border border-danger/40",
        link: "text-gold-300 underline-offset-4 hover:underline hover:text-gold-200 px-0",
      },
      size: {
        sm: "h-9 px-4 text-xs tracking-wide rounded-sm [&_svg]:size-3.5",
        md: "h-11 px-6 text-sm tracking-wide rounded-sm [&_svg]:size-4",
        lg: "h-14 px-9 text-sm uppercase tracking-[0.18em] rounded-sm [&_svg]:size-4",
        icon: "h-10 w-10 rounded-sm [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
