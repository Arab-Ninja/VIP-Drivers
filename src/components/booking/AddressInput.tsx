"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Loader2, X } from "lucide-react";

import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type AddressValue = {
  address: string;
  lat: number;
  lng: number;
} | null;

type Suggestion = {
  id: string;
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
};

/**
 * Address field with server-proxied autocomplete.
 *
 * A value only counts as selected once the visitor picks a suggestion, since
 * a price cannot be computed from free text. Typing over a chosen address
 * clears the coordinates, which makes the parent form fall back to "waiting
 * for an address" rather than silently pricing the previous one.
 */
export function AddressInput({
  label,
  placeholder,
  value,
  onChange,
  onClear,
  required,
  id: providedId,
  className,
}: {
  label: string;
  placeholder?: string;
  value: AddressValue;
  onChange: (value: NonNullable<AddressValue>) => void;
  onClear: () => void;
  required?: boolean;
  id?: string;
  className?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const listboxId = `${id}-listbox`;

  const [query, setQuery] = useState(value?.address ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  // Guards against a slow earlier request overwriting a newer one's results.
  const requestSeq = useRef(0);
  const skipNextSearch = useRef(false);

  // Reflect an externally-set value (a stop being reordered, a form reset).
  useEffect(() => {
    if (value?.address && value.address !== query) {
      skipNextSearch.current = true;
      setQuery(value.address);
    }
    // Only react to the incoming value, never to local typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.address]);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const seq = ++requestSeq.current;
    // Debounced so a keyless deployment stays inside the OpenStreetMap
    // rate limit, and so Mapbox usage stays low.
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/geo/search?q=${encodeURIComponent(trimmed)}`);
        const data = (await response.json()) as { results?: Suggestion[] };
        if (seq !== requestSeq.current) return;
        setSuggestions(data.results ?? []);
        setOpen(true);
        setHighlighted(-1);
      } catch {
        if (seq === requestSeq.current) setSuggestions([]);
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function select(suggestion: Suggestion) {
    skipNextSearch.current = true;
    setQuery(suggestion.fullAddress);
    setOpen(false);
    setSuggestions([]);
    onChange({ address: suggestion.fullAddress, lat: suggestion.lat, lng: suggestion.lng });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && highlighted >= 0) {
      event.preventDefault();
      select(suggestions[highlighted]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-200">
        {label}
      </label>

      <div className="relative">
        <MapPin
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2",
            value ? "text-gold-400" : "text-ink-400",
          )}
          aria-hidden
        />
        <Input
          id={id}
          value={query}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="pl-9 pr-9"
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onClear();
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
        />

        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-400" />
        ) : query ? (
          <button
            type="button"
            aria-label="Effacer"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-100"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              onClear();
            }}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {open && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-72 w-full overflow-auto rounded-sm border border-ink-600 bg-ink-850 py-1 shadow-lift"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="option" aria-selected={index === highlighted}>
              <button
                type="button"
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => select(suggestion)}
                className={cn(
                  "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
                  index === highlighted ? "bg-ink-700" : "hover:bg-ink-800",
                )}
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold-600" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink-100">{suggestion.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-ink-400">
                    {suggestion.fullAddress}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
