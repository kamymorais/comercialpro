import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardVariant = "default" | "highlight";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variants: Record<CardVariant, string> = {
  default: "border-slate-200 bg-white",
  highlight: "border-blue-100 bg-blue-50",
};

export function Card({
  children,
  className,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5 shadow-sm",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
