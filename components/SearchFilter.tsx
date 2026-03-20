"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchFilter({ value, onChange }: SearchFilterProps) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(draft), 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [draft, onChange]);

  return (
    <div className="relative mb-5">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search by artist or venue…"
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-9 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/25 focus:bg-white/[0.07]"
      />
      {draft && (
        <button
          onClick={() => { setDraft(""); onChange(""); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
