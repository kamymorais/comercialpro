import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/cn";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBottomNav?: boolean;
  className?: string;
};

export function AppShell({
  children,
  title,
  subtitle,
  showBottomNav = false,
  className,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div
        className={cn(
          "mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-6 sm:px-8",
          showBottomNav && "pb-24",
          className,
        )}
      >
        <Header subtitle={subtitle} />
        {title ? (
          <div className="mb-6">
            <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
          </div>
        ) : null}
        <div className="flex-1">{children}</div>
      </div>
      {showBottomNav ? <BottomNav /> : null}
    </main>
  );
}
