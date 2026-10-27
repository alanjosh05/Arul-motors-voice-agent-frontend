"use client";

import { addDays, format } from "date-fns";
import { CalendarRange } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { todayISO, toISO } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A chart's period: the last / next 7, 15 or 30 days, all time, or a custom range. */
export type ChartRange = { preset: 7 | 15 | 30 | "all" | "custom"; from?: string; to?: string };

const PRESETS = [
  { value: 7, label: "1 week" },
  { value: 15, label: "15 days" },
  { value: 30, label: "30 days" },
] as const;

const day = (iso: string) => new Date(`${iso}T00:00:00`);

/** The range's first and last dates (showroom days). Past charts count back
 * from today, future ones forward. null = all time. */
export function rangeDates(range: ChartRange, direction: "past" | "future"): { start: string; end: string } | null {
  if (range.preset === "all") return null;
  if (range.preset === "custom" && range.from && range.to) return { start: range.from, end: range.to };
  const n = typeof range.preset === "number" ? range.preset : 30;
  const today = day(todayISO());
  return direction === "past"
    ? { start: toISO(addDays(today, -(n - 1))), end: toISO(today) }
    : { start: toISO(today), end: toISO(addDays(today, n - 1)) };
}

/** "the last 15 days" / "the next 1 week" / "12 Oct – 20 Oct" / "all time". */
export function rangeLabel(range: ChartRange, direction: "past" | "future"): string {
  if (range.preset === "all") return "all time";
  if (range.preset === "custom" && range.from && range.to)
    return `${format(day(range.from), "d MMM")} – ${format(day(range.to), "d MMM yyyy")}`;
  const n = typeof range.preset === "number" ? range.preset : 30;
  return `the ${direction === "past" ? "last" : "next"} ${n === 7 ? "week" : `${n} days`}`;
}

/** Chart period picker: 1 week · 15 days · 30 days (· All) and a custom range. */
export function RangeFilter({
  value,
  onChange,
  allowAll,
  className,
}: {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
  /** Offer "All" (charts that aren't about a period by default). */
  allowAll?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(
    value.from && value.to ? { from: day(value.from), to: day(value.to) } : undefined,
  );
  const custom = value.preset === "custom" && value.from && value.to;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={value.preset === "custom" ? "" : String(value.preset)}
        onValueChange={(v) => v && onChange({ preset: v === "all" ? "all" : (Number(v) as 7 | 15 | 30) })}
      >
        {PRESETS.map((p) => (
          <ToggleGroupItem key={p.value} value={String(p.value)} className="px-2.5 text-xs">
            {p.label}
          </ToggleGroupItem>
        ))}
        {allowAll && (
          <ToggleGroupItem value="all" className="px-2.5 text-xs">
            All
          </ToggleGroupItem>
        )}
      </ToggleGroup>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant={custom ? "secondary" : "outline"} size="sm" className="h-8 gap-1.5 text-xs">
            <CalendarRange className="size-3.5" />
            {custom ? rangeLabel(value, "past") : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={draft}
            defaultMonth={draft?.from ?? addDays(new Date(), -30)}
            onSelect={setDraft}
          />
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <span className="text-xs text-muted-foreground">
              {draft?.from && draft?.to
                ? `${format(draft.from, "d MMM")} – ${format(draft.to, "d MMM yyyy")}`
                : "Pick the first and last day (up to a year)"}
            </span>
            <Button
              size="sm"
              disabled={!draft?.from || !draft?.to}
              onClick={() => {
                onChange({ preset: "custom", from: toISO(draft!.from!), to: toISO(draft!.to!) });
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
