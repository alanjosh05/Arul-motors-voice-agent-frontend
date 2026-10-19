"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { CustomerAvatar } from "@/components/customer-avatar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMobile } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CustomerPicker({
  customers,
  value,
  onChange,
  invalid,
}: {
  customers: Customer[];
  value: number | null;
  onChange: (id: number) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = customers.find((c) => c.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-invalid={invalid} className="h-9 w-full justify-between font-normal">
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <CustomerAvatar name={selected.name} className="size-5" />
              {selected.name}
              <span className="text-muted-foreground">{formatMobile(selected.mobile_number)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Search customer…</span>
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Name, mobile or registration…" />
          <CommandList>
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.mobile_number} ${c.vehicles.map((v) => `${v.registration_number} ${v.model}`).join(" ")}`}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <CustomerAvatar name={c.name} className="size-6" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatMobile(c.mobile_number)} · {c.vehicles.map((v) => v.model).join(", ") || "No bike"}
                    </p>
                  </div>
                  <Check className={cn("ml-auto", value === c.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
