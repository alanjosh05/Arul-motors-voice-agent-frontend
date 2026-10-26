"use client";

import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useShowroomStaff } from "@/lib/queries";
import type { StaffCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const tidy = (text: string) => text.replace(/\s+/g, " ").trim();

/** Pick someone from Our staff in one category (e.g. the job card's mechanic):
 * type to filter the list. A name that isn't listed (as read off a job card)
 * can still be used as typed. */
export function StaffPicker({
  category,
  value,
  onChange,
  id,
  placeholder,
}: {
  category: StaffCategory;
  value: string;
  onChange: (name: string) => void;
  id?: string;
  placeholder?: string;
}) {
  const { data } = useShowroomStaff();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const typed = tidy(search);
  const people = (data ?? []).filter((p) => p.category === category && p.active);
  const shown = typed ? people.filter((p) => p.name.toLowerCase().includes(typed.toLowerCase())) : people;
  const known = people.some((p) => p.name.toLowerCase() === typed.toLowerCase());
  const listed = !value || people.some((p) => p.name.toLowerCase() === value.toLowerCase());

  const choose = (name: string) => {
    onChange(tidy(name));
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
            className={cn("h-9 w-full justify-between font-normal", value && "pr-9")}
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || placeholder || `Choose a ${category.toLowerCase()}…`}
              {!listed && <span className="ml-1 text-xs text-muted-foreground">(not in Our staff)</span>}
            </span>
            {!value && <ChevronsUpDown className="opacity-50" />}
          </Button>
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Clear"
            title="Clear"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={`Type a ${category.toLowerCase()}'s name…`} value={search} onValueChange={setSearch} />
          <CommandList>
            {!typed && people.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No {category.toLowerCase()}s in Our staff yet. An admin can add them; or type a name.
              </p>
            )}
            {shown.length > 0 && (
              <CommandGroup heading={`${category}s`}>
                {shown.map((p) => (
                  <CommandItem key={p.id} value={String(p.id)} onSelect={() => choose(p.name)}>
                    <Check className={cn(value.toLowerCase() === p.name.toLowerCase() ? "opacity-100" : "opacity-0")} />
                    <span className="flex-1 truncate">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {typed && !known && (
              <CommandGroup heading={shown.length ? "Not listed?" : "No match"}>
                <CommandItem value={`typed:${typed}`} onSelect={() => choose(typed)}>
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
