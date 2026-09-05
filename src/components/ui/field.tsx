import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-sm border border-ink-700 bg-ink-900/80 px-3.5 text-sm text-ink-100 transition-colors",
        "placeholder:text-ink-400 hover:border-ink-600",
        "focus:border-gold-500/70 focus:outline-none focus:ring-1 focus:ring-gold-500/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger/70 aria-invalid:ring-danger/30",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-sm border border-ink-700 bg-ink-900/80 px-3.5 py-3 text-sm text-ink-100 transition-colors",
      "placeholder:text-ink-400 hover:border-ink-600 min-h-24 resize-y",
      "focus:border-gold-500/70 focus:outline-none focus:ring-1 focus:ring-gold-500/40",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full appearance-none rounded-sm border border-ink-700 bg-ink-900/80 px-3.5 text-sm text-ink-100 transition-colors",
      "hover:border-ink-600 focus:border-gold-500/70 focus:outline-none focus:ring-1 focus:ring-gold-500/40",
      "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22%238a8a94%22 stroke-width=%221.5%22%3E%3Cpath stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  className,
  children,
  hint,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: string }) {
  return (
    <label
      className={cn("mb-1.5 flex items-baseline gap-2 text-xs font-medium text-ink-200", className)}
      {...props}
    >
      <span>{children}</span>
      {hint ? <span className="text-[0.7rem] font-normal text-ink-400">{hint}</span> : null}
    </label>
  );
}

export function FormField({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <Label htmlFor={htmlFor} hint={hint}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
