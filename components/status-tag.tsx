import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, CircleCheck, Clock, X, type LucideIcon } from "lucide-react";
import { type TourRequest } from "@/schemas/tour";

const STATUS: Record<
  TourRequest["status"],
  { icon: LucideIcon; className: string }
> = {
  pending: {
    icon: Clock,
    className: "bg-secondary text-secondary-foreground",
  },
  confirmed: {
    icon: CircleCheck,
    className: "bg-primary text-primary-foreground",
  },
  declined: {
    icon: X,
    className: "bg-muted text-muted-foreground",
  },
  reschedule: {
    icon: Calendar,
    className: "bg-accent text-accent-foreground",
  },
};

export function StatusTag({ status }: { status: TourRequest["status"] }) {
  const t = useTranslations("tours.status");
  const key = status in STATUS ? status : "pending";
  const Icon = STATUS[key].icon;
  return (
    <Badge variant="secondary" className={cn("gap-1", STATUS[key].className)}>
      <Icon size={13} /> {t(key)}
    </Badge>
  );
}
