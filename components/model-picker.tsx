"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBikeModels } from "@/lib/queries";
import { cn } from "@/lib/utils";

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

/** Bike model: pick one already saved for other customers, or type a new one. */
export function ModelPicker({
  value,
  onChange,
  invalid,
  id,
  placeholder = "Choose or type a model…",
}: {
  value: string;
  onChange: (model: string) => void;
  invalid?: boolean;
  id?: string;
  placeholder?: string;
}) {
  const models = useBikeModels();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const typed = tidy(search);
  const known = models.some((m) => m.model.toLowerCase() === typed.toLowerCase());

  const choose = (model: string) => {
    onChange(tidy(model));
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} aria-invalid={invalid} className="h-9 w-full justify-between font-normal">
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or type a new model…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{typed ? "No saved model matches." : "No models saved yet. Type one."}</CommandEmpty>
            {models.length > 0 && (
              <CommandGroup heading="Saved models">
                {models.map((m) => (
                  <CommandItem key={m.model} value={m.model} onSelect={() => choose(m.model)}>
                    <Check className={cn(value.toLowerCase() === m.model.toLowerCase() ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">{m.model}</span>
                    <span className="text-xs text-muted-foreground tabular">
                      {m.count} bike{m.count === 1 ? "" : "s"}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {typed && !known && (
              <CommandGroup heading="New model">
                {/* forceMount: always offered while typing, whatever the filter matches. */}
                <CommandItem forceMount value={`new:${typed}`} onSelect={() => choose(typed)}>
                  <Plus /> Use “{typed}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
