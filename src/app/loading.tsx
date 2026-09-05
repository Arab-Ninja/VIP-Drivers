export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-live="polite">
      <span className="relative grid size-12 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full border border-gold-600/40" />
        <span className="font-display text-sm text-gradient-gold">VD</span>
      </span>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
