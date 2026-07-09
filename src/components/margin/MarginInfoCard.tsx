import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type MarginInfoCardProps = {
  title: string;
  description: string;
  variant?: "info" | "warning";
};

export function MarginInfoCard({
  title,
  description,
  variant = "info",
}: MarginInfoCardProps) {
  return (
    <Card
      className={cn(variant === "warning" && "border-amber-200 bg-amber-50")}
    >
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Card>
  );
}
