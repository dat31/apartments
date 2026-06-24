import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, CircleCheck, Clock, X, type LucideIcon } from "lucide-react";
import { type TourRequest } from "@/schemas/tour";

const STATUS: Record<
  TourRequest["status"],
  { label: string; icon: LucideIcon; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-secondary text-secondary-foreground",
  },
  confirmed: {
    label: "Confirmed",
    icon: CircleCheck,
    className: "bg-primary text-primary-foreground",
  },
  declined: {
    label: "Declined",
    icon: X,
    className: "bg-muted text-muted-foreground",
  },
  reschedule: {
    label: "New time proposed",
    icon: Calendar,
    className: "bg-accent text-accent-foreground",
  },
};

export function StatusTag({ status }: { status: TourRequest["status"] }) {
  const s = STATUS[status] ?? STATUS.pending;
  const Icon = s.icon;
  return (
    <Badge variant="secondary" className={cn("gap-1", s.className)}>
      <Icon size={13} /> {s.label}
    </Badge>
  );
}
