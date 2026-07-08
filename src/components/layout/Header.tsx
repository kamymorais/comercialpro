import { cn } from "@/lib/cn";

type HeaderProps = {
  subtitle?: string;
  className?: string;
};

export function Header({ subtitle, className }: HeaderProps) {
  return (
    <header className={cn("pb-6 pt-2", className)}>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-900">
        ComercialPro
      </p>
      {subtitle ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      ) : null}
    </header>
  );
}
