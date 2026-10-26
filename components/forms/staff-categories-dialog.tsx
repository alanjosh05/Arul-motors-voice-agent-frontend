"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCreateStaffCategory, useDeleteStaffCategory, useStaffCategories, useUpdateStaffCategory } from "@/lib/queries";
import type { StaffCategoryRow } from "@/lib/types";

/** One category: rename it (its people move with it), switch whether its
 * people are the job card's mechanics, or delete it when it's empty. */
function CategoryRow({ category }: { category: StaffCategoryRow }) {
  const [name, setName] = useState(category.name);
  const update = useUpdateStaffCategory();
  const remove = useDeleteStaffCategory();
  const renamed = name.trim() && name.trim() !== category.name;
  const rename = () => renamed && update.mutate({ id: category.id, name: name.trim() });

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), rename())}
        className="h-8 min-w-36 flex-1"
        aria-label={`Name of ${category.name}`}
      />
      {renamed && (
        <Button size="sm" className="h-8" onClick={rename} disabled={update.isPending}>
          <Check /> Save
        </Button>
      )}
      <span className="tabular w-16 text-xs text-muted-foreground">{category.staff_count} staff</span>
      <label className="flex items-center gap-2 text-xs">
        <Switch
          checked={category.is_mechanic}
          onCheckedChange={(on) => update.mutate({ id: category.id, is_mechanic: on })}
          aria-label="Mechanics on job cards"
        />
        Job card mechanics
      </label>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              disabled={category.staff_count > 0 || remove.isPending}
              onClick={() => remove.mutate(category.id)}
              aria-label={`Delete ${category.name}`}
            >
              <Trash2 />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {category.staff_count > 0 ? "Move or remove its staff first" : `Delete ${category.name}`}
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

/** Admins: Our staff's categories (Sales, Spares, Mechanic to start). */
export function StaffCategoriesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data } = useStaffCategories();
  const create = useCreateStaffCategory();
  const [name, setName] = useState("");
  const add = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim() }, { onSuccess: () => setName("") });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Staff categories</DialogTitle>
          <DialogDescription>
            Add the showroom&rsquo;s own categories (e.g. Washing, Accounts). Renaming moves its staff with it. Staff in a
            &ldquo;Job card mechanics&rdquo; category appear in the job card&rsquo;s mechanic list.
          </DialogDescription>
        </DialogHeader>
        <ul className="scroll-y max-h-[50svh] space-y-2">
          {(data ?? []).map((c) => (
            <CategoryRow key={`${c.id}:${c.name}`} category={c} />
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category, e.g. Washing" aria-label="New category" />
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            <Plus /> Add
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
