"use client";

import { useState } from "react";
import { FormDialog } from "@/components/forms/form-dialog";
import { useAutosaveDraft, useFormDraft } from "@/lib/drafts";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateServiceType, useUpdateServiceType } from "@/lib/queries";
import type { ServiceType } from "@/lib/types";

const whole = (v: string) => (v.trim() === "" ? null : Number(v));

/** Add or edit a service type. */
export function ServiceTypeDialog({
  open,
  onOpenChange,
  serviceType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceType?: ServiceType;
}) {
  const editing = !!serviceType;
  // Mounted only while open: fields start from the type, or from what was
  // typed before if the form was closed without saving.
  const draftKey = editing ? `service-type:${serviceType.id}` : "service-type:new";
  const draft = useFormDraft(draftKey);
  const [name, setName] = useState(draft.get("name", serviceType?.name ?? ""));
  const [description, setDescription] = useState(draft.get("description", serviceType?.description ?? ""));
  const [isFree, setIsFree] = useState(draft.get("isFree", serviceType?.is_free ?? false));
  const [scheduled, setScheduled] = useState(draft.get("scheduled", serviceType ? serviceType.interval_days != null : true));
  const [days, setDays] = useState(draft.get("days", serviceType?.interval_days != null ? String(serviceType.interval_days) : ""));
  const [km, setKm] = useState(draft.get("km", serviceType?.interval_km != null ? String(serviceType.interval_km) : ""));
  const [price, setPrice] = useState(draft.get("price", serviceType?.price != null ? String(serviceType.price) : ""));
  const [active, setActive] = useState(draft.get("active", serviceType?.active ?? true));
  useAutosaveDraft(draftKey, { name, description, isFree, scheduled, days, km, price, active });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateServiceType();
  const update = useUpdateServiceType();

  async function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter a name.";
    if (scheduled && !(Number(days) > 0)) next.days = "Enter how many days until it's due.";
    if (km && !/^\d+$/.test(km)) next.km = "Kilometres as a whole number.";
    if (!isFree && price && !/^\d+$/.test(price)) next.price = "Price in whole rupees.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      is_free: isFree,
      interval_days: scheduled ? whole(days) : null,
      interval_km: scheduled ? whole(km) : null,
      price: isFree ? null : whole(price),
      active,
    };
    if (editing) await update.mutateAsync({ id: serviceType.id, ...body });
    else await create.mutateAsync(body);
    draft.clear();
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      draft={draft}
      title={editing ? `Edit ${serviceType.name}` : "Add service type"}
      description={
        editing && (serviceType.bikes_due || serviceType.bookings)
          ? `Renaming also updates ${serviceType.bikes_due} bike(s) and ${serviceType.bookings} booking(s) that use it.`
          : "Services the workshop offers. Scheduled types decide when the agent follows up."
      }
      submitLabel={editing ? "Save changes" : "Add service type"}
      pending={create.isPending || update.isPending}
      onSubmit={() => submit().catch(() => {})}
    >
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="st-name">Name</FieldLabel>
          <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engine oil change" aria-invalid={!!errors.name} autoFocus />
          <FieldError>{errors.name}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="st-desc">Description</FieldLabel>
          <Textarea id="st-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's included (optional)" />
        </Field>

        <Field orientation="horizontal" className="rounded-lg border p-3">
          <FieldContent>
            <FieldTitle>Free service</FieldTitle>
            <FieldDescription>Included with the bike (e.g. the 3 free services).</FieldDescription>
          </FieldContent>
          <Switch checked={isFree} onCheckedChange={setIsFree} aria-label="Free service" />
        </Field>

        <Field orientation="horizontal" className="rounded-lg border p-3">
          <FieldContent>
            <FieldTitle>Part of the service schedule</FieldTitle>
            <FieldDescription>Falls due a set time after the previous service. Off = on demand only.</FieldDescription>
          </FieldContent>
          <Switch checked={scheduled} onCheckedChange={setScheduled} aria-label="Scheduled" />
        </Field>

        {scheduled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.days}>
              <FieldLabel htmlFor="st-days">Due after</FieldLabel>
              <InputGroup>
                <InputGroupInput id="st-days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder="90" aria-invalid={!!errors.days} />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>days</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.days}</FieldError>
            </Field>
            <Field data-invalid={!!errors.km}>
              <FieldLabel htmlFor="st-km">or after</FieldLabel>
              <InputGroup>
                <InputGroupInput id="st-km" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder="4000" aria-invalid={!!errors.km} />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>km</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.km}</FieldError>
            </Field>
          </div>
        )}

        {!isFree && (
          <Field data-invalid={!!errors.price}>
            <FieldLabel htmlFor="st-price">Price</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>₹</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput id="st-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Optional" aria-invalid={!!errors.price} />
            </InputGroup>
            <FieldDescription>Shown to staff only. The voice agent never quotes prices.</FieldDescription>
            <FieldError>{errors.price}</FieldError>
          </Field>
        )}

        <Field orientation="horizontal" className="rounded-lg border p-3">
          <FieldContent>
            <FieldTitle>Active</FieldTitle>
            <FieldDescription>Inactive types are hidden from new bookings and bikes.</FieldDescription>
          </FieldContent>
          <Switch checked={active} onCheckedChange={setActive} aria-label="Active" />
        </Field>
      </FieldGroup>
    </FormDialog>
  );
}
