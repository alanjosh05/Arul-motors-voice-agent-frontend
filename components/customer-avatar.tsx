import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-primary/12 text-primary",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/20 text-[color-mix(in_oklch,var(--chart-3),black_35%)] dark:text-chart-3",
  "bg-chart-4/12 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

export function CustomerAvatar({ name, className }: { name: string; className?: string }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback className={cn("text-xs font-semibold", PALETTE[hash % PALETTE.length])}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
