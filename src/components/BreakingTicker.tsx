"use client";
import Link from "next/link";
import type { Article } from "../lib/types";

export default function BreakingTicker({ items }: { items: Article[] }) {
  if (!items.length) return null;
  const loop = [...items, ...items];

  return (
    <div className="bg-crimson text-white overflow-hidden">
      <div className="max-w-6xl mx-auto md:px-4">
        <div className="flex items-stretch">
          <div className="shrink-0 bg-ink px-3 md:px-4 py-2 text-[11px] md:text-xs font-semibold tracking-[0.18em] uppercase flex items-center">
            BREAKING
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div className="ticker-track w-max flex gap-10 whitespace-nowrap py-2 px-4 text-sm font-gujarati">
              {loop.map((a, i) => (
                <Link
                  key={`${a.id}-${i}`}
                  href={`/news/${a.slug}`}
                  className="hover:underline"
                >
                  {a.headline}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
