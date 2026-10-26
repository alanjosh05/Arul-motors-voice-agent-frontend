"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { day, formatDay, toISO } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Date input storing "YYYY-MM-DD". `min`/`max` limit the selectable range. */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  id,
  invalid,
  clearLabel,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  /** Show a button under the calendar that empties the date, e.g. "Not known". */
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const disabled = [
    ...(min ? [{ before: day(min) }] : []),
    ...(max ? [{ after: day(max) }] : []),
  ];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          className={cn("h-9 w-full justify-start font-normal", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="text-muted-foreground" />
          {value ? formatDay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? day(value) : undefined}
          defaultMonth={value ? day(value) : min ? day(min) : undefined}
          disabled={disabled}
          onSelect={(date) => {
            onChange(date ? toISO(date) : null);
            setOpen(false);
          }}
        />
        {clearLabel && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              {clearLabel}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
