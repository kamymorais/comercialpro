import Link from "next/link";
import type { Role } from "@/generated/prisma/client";
import { getDashboardPathByRole } from "@/lib/auth";
import { cn } from "@/lib/cn";

type ModuleNavProps = {
  role: Role;
  active: "previsao" | "margem";
};

export function ModuleNav({ role, active }: ModuleNavProps) {
  const items = [
    {
      key: "previsao" as const,
      label: "Previsão",
      href: getDashboardPathByRole(role),
    },
    {
      key: "margem" as const,
      label: "Verificador de Margem",
      href: "/verificador-margem",
    },
  ];

  return (
    <nav
      className="flex flex-wrap gap-2"
      aria-label="Módulos do ComercialPro"
    >
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={active === item.key ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            active === item.key
              ? "bg-blue-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
