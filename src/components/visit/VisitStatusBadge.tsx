import { Badge } from "@/components/ui/Badge";
import { getVisitStatusLabel } from "@/services/visit.service";
import type { VisitStatus } from "@/generated/prisma/client";

type VisitStatusBadgeProps = {
  status: VisitStatus;
};

export function VisitStatusBadge({ status }: VisitStatusBadgeProps) {
  const variants: Record<
    VisitStatus,
    "neutral" | "info" | "warning" | "danger" | "success"
  > = {
    ASSIGNED: "warning",
    SUBMITTED: "info",
    REVISION_REQUESTED: "danger",
    COMPLETED: "success",
  };

  return <Badge variant={variants[status]}>{getVisitStatusLabel(status)}</Badge>;
}
