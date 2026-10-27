"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** A row's actions, side by side and always visible (no ⋯ menu): every
 * action is one click, or two with its confirmation. Clicks don't reach the
 * row (rows open the record). */
export function RowActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-0.5", className)} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

/** One action: an icon button with its name as a tooltip. `destructive`
 * colours it red (delete, cancel). `disabledReason` explains a disabled one. */
export function RowAction({
  label,
  icon: Icon,
  onClick,
  href,
  destructive,
  disabled,
  disabledReason,
}: {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const className = cn(destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive");
  const button =
    href && !disabled ? (
      <Button variant="ghost" size="icon-sm" className={className} aria-label={label} asChild>
        <Link href={href}>
          <Icon />
        </Link>
      </Button>
    ) : (
      <Button variant="ghost" size="icon-sm" className={className} aria-label={label} disabled={disabled} onClick={onClick}>
        <Icon />
      </Button>
    );
  return (
    <Tooltip>
      {/* A disabled button gets no pointer events: the span keeps the tooltip. */}
      <TooltipTrigger asChild>{disabled ? <span tabIndex={0}>{button}</span> : button}</TooltipTrigger>
      <TooltipContent>{disabled && disabledReason ? disabledReason : label}</TooltipContent>
    </Tooltip>
  );
}
