"use client";

import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBikeModels } from "@/lib/queries";
import { cn } from "@/lib/utils";

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();
const alnum = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Bike model: pick one already saved for other customers, or type a new one.
 * The × (or "Clear selection") removes a model picked by mistake. */
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
  // Our own matching (not cmdk's filter, which hid the "Use …" option exactly
  // when nothing saved matched): spaces and punctuation ignored ("fzs" -> FZ-S).
  const shown = typed ? models.filter((m) => alnum(m.model).includes(alnum(typed))) : models;

  const choose = (model: string) => {
    onChange(tidy(model));
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            className={cn("h-9 w-full justify-between font-normal", value && "pr-9")}
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
            {!value && <ChevronsUpDown className="opacity-50" />}
          </Button>
        </PopoverTrigger>
        {value && (
          // Beside the trigger, not inside it (a button can't hold a button).
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear model"
            title="Clear model"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or type a new model…" value={search} onValueChange={setSearch} />
          <CommandList>
            {!typed && models.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No models saved yet. Type one.</p>
            )}
            {shown.length > 0 && (
              <CommandGroup heading="Saved models">
                {shown.map((m) => (
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
              <CommandGroup heading={shown.length ? "Or add a new model" : "New model"}>
                <CommandItem value={`new:${typed}`} onSelect={() => choose(typed)}>
                  <Plus /> Use “{typed}”
                </CommandItem>
              </CommandGroup>
            )}
            {value && !typed && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem value="clear-selection" onSelect={() => choose("")} className="text-muted-foreground">
                    <X /> Clear selection
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
