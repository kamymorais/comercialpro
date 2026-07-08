"use client";

import { cn } from "@/lib/cn";

type BottomNavItem = {
  label: string;
  active?: boolean;
};

type BottomNavProps = {
  items?: BottomNavItem[];
  className?: string;
};

const defaultItems: BottomNavItem[] = [
  { label: "Inicio", active: true },
  { label: "Previsoes" },
  { label: "Equipe" },
];

export function BottomNav({ items = defaultItems, className }: BottomNavProps) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur",
        className,
      )}
      aria-label="Navegacao inferior provisoria"
    >
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className={cn(
              "min-h-11 rounded-lg px-3 text-sm font-medium transition-colors",
              item.active
                ? "bg-blue-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
