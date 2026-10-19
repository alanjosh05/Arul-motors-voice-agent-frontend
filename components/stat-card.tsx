import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "destructive";
  loading?: boolean;
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-[color-mix(in_oklch,var(--warning),black_30%)] dark:text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="tabular text-3xl font-semibold tracking-tight">{value}</p>
          )}
          {hint && <div className="text-xs text-muted-foreground">{loading ? <Skeleton className="h-3.5 w-28" /> : hint}</div>}
        </div>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tones[tone])}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
