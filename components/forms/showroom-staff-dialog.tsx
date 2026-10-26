"use client";

import { useState } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAutosaveDraft, useFormDraft } from "@/lib/drafts";
import { useCreateShowroomStaff, useUpdateShowroomStaff } from "@/lib/queries";
import { STAFF_CATEGORIES, type ShowroomStaff, type StaffCategory } from "@/lib/types";

const digits = (v: string) => v.replace(/\D/g, "");

/** Admins: add someone to Our staff, or edit them. */
export function ShowroomStaffDialog({
  open,
  onOpenChange,
  person,
  category: initialCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: ShowroomStaff;
  /** New person: start in this category (the tab being viewed). */
  category?: StaffCategory;
}) {
  const editing = !!person;
  const draftKey = editing ? `showroom-staff:${person.id}` : "showroom-staff:new";
  const draft = useFormDraft(draftKey);
  const [name, setName] = useState(draft.get("name", person?.name ?? ""));
  const [category, setCategory] = useState<StaffCategory>(draft.get("category", person?.category ?? initialCategory ?? "Mechanic"));
  const [mobile, setMobile] = useState(draft.get("mobile", person?.mobile_number ?? ""));
  const [active, setActive] = useState(draft.get("active", person?.active ?? true));
  useAutosaveDraft(draftKey, { name, category, mobile, active });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateShowroomStaff();
  const update = useUpdateShowroomStaff();

  async function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter the name.";
    if (mobile.trim() && digits(mobile).length < 10) next.mobile = "Enter a 10-digit number, or leave it empty.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = { name: name.trim(), category, mobile_number: mobile.trim(), active };
    if (editing) await update.mutateAsync({ id: person.id, ...body });
    else await create.mutateAsync({ ...body, mobile_number: body.mobile_number || null });
    draft.clear();
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      draft={draft}
      title={editing ? `Edit ${person.name}` : "Add staff"}
      description="The showroom’s people. Mechanics appear in the job card’s mechanic list."
      submitLabel={editing ? "Save changes" : "Add staff"}
      pending={create.isPending || update.isPending}
      onSubmit={() => submit().catch(() => {})}
    >
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="ss-name">Name</FieldLabel>
          <Input id="ss-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kumar" aria-invalid={!!errors.name} autoFocus />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel>Category</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            className="w-full"
            value={category}
            onValueChange={(v) => v && setCategory(v as StaffCategory)}
          >
            {STAFF_CATEGORIES.map((c) => (
              <ToggleGroupItem key={c} value={c} className="flex-1">
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field data-invalid={!!errors.mobile}>
          <FieldLabel htmlFor="ss-mobile">Mobile</FieldLabel>
          <Input id="ss-mobile" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Optional" aria-invalid={!!errors.mobile} />
          <FieldError>{errors.mobile}</FieldError>
        </Field>
        {editing && (
          <Field orientation="horizontal" className="rounded-lg border p-3">
            <FieldContent>
              <FieldTitle>Working here</FieldTitle>
              <FieldDescription>Off: kept on the list, but not offered on job cards.</FieldDescription>
            </FieldContent>
            <Switch checked={active} onCheckedChange={setActive} aria-label="Working here" />
          </Field>
        )}
      </FieldGroup>
    </FormDialog>
  );
}
