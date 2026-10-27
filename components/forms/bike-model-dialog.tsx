"use client";

import { useState } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAutosaveDraft, useFormDraft } from "@/lib/drafts";
import { useCreateBikeModel, useRenameBikeModel } from "@/lib/queries";
import type { BikeModel } from "@/lib/types";

/** Add a bike model to the list, or rename one (its bikes follow). */
export function BikeModelDialog({ open, onOpenChange, model }: { open: boolean; onOpenChange: (open: boolean) => void; model?: BikeModel }) {
  const editing = !!model;
  const draftKey = editing ? `bike-model:${model.id}` : "bike-model:new";
  const draft = useFormDraft(draftKey);
  const [name, setName] = useState(draft.get("name", model?.name ?? ""));
  useAutosaveDraft(draftKey, { name });
  const [error, setError] = useState<string | null>(null);
  const create = useCreateBikeModel();
  const rename = useRenameBikeModel();

  async function submit() {
    if (!name.trim()) return setError("Enter the model's name.");
    setError(null);
    if (editing) await rename.mutateAsync({ id: model.id, name: name.trim() });
    else await create.mutateAsync(name.trim());
    draft.clear();
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      draft={draft}
      title={editing ? `Rename ${model.name}` : "Add bike model"}
      description={editing ? `${model.bikes} bike(s) of this model are renamed too.` : "It then appears in the model list when adding a customer or bike."}
      submitLabel={editing ? "Save" : "Add model"}
      pending={create.isPending || rename.isPending}
      onSubmit={() => submit().catch(() => {})}
    >
      <FieldGroup>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="bm-name">Model</FieldLabel>
          <Input id="bm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yamaha FZ-S Fi V4" aria-invalid={!!error} autoFocus />
          <FieldDescription>Use the full name as on the bill, e.g. Yamaha Ray ZR 125 Fi Hybrid.</FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>
      </FieldGroup>
    </FormDialog>
  );
}
