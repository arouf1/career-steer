"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface SerpApiLocation {
  id: string;
  name: string;
  canonicalName: string;
  countryCode: string;
  targetType: string;
}

interface LocationAutocompleteProps {
  value: string;
  onSelect: (location: { display: string; canonical: string }) => void;
  onDisplayChange?: (display: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({
  value,
  onSelect,
  onDisplayChange,
  placeholder = "e.g. London, UK",
  className,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SerpApiLocation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasValidSelection, setHasValidSelection] = useState(!!value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(value);
    setHasValidSelection(!!value);
  }, [value]);

  const fetchLocations = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/locations/search?q=${encodeURIComponent(q.trim())}`,
        { signal: controller.signal },
      );
      if (res.ok) {
        const data = (await res.json()) as SerpApiLocation[];
        setResults(data);
        setIsOpen(data.length > 0);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setResults([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setHighlightedIndex(-1);
    setHasValidSelection(false);
    onDisplayChange?.("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLocations(val), 300);
  }

  function handleSelect(loc: SerpApiLocation) {
    setQuery(loc.canonicalName);
    setIsOpen(false);
    setResults([]);
    setHasValidSelection(true);
    onSelect({ display: loc.canonicalName, canonical: loc.canonicalName });
  }

  function handleBlur() {
    setTimeout(() => {
      if (!hasValidSelection) {
        setQuery("");
        onDisplayChange?.("");
      }
    }, 200);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1,
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const inputClass =
    className ??
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={inputClass}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="location-listbox"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul
          id="location-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md"
        >
          {results.map((loc, i) => (
            <li
              key={loc.id}
              role="option"
              aria-selected={i === highlightedIndex}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors ${
                i === highlightedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
              onMouseEnter={() => setHighlightedIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(loc);
              }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <span className="block truncate font-medium">{loc.name}</span>
                <span
                  className={`block truncate text-xs ${
                    i === highlightedIndex
                      ? "text-accent-foreground/70"
                      : "text-foreground/60"
                  }`}
                >
                  {loc.canonicalName}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
