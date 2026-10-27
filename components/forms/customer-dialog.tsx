"use client";

import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { BoughtFromField } from "@/components/forms/bought-from-field";
import { FormDialog } from "@/components/forms/form-dialog";
import { ModelPicker } from "@/components/model-picker";
import { useAutosaveDraft, useFormDraft } from "@/lib/drafts";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayISO } from "@/lib/format";
import { useAddVehicle, useCreateCustomer, useScheduleTypeNames, useUpdateCustomer } from "@/lib/queries";
import type { Customer } from "@/lib/types";

const digits = (v: string) => v.replace(/\D/g, "");

/** Create a customer (optionally with their first bike) or edit name/mobile. */
export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onCreated?: (id: number) => void;
}) {
  const editing = !!customer;
  // Mounted only while open: fields start from the record, or from what was
  // typed before if the form was closed without saving.
  const draftKey = editing ? `customer:${customer.id}` : "customer:new";
  const draft = useFormDraft(draftKey);
  const [name, setName] = useState(draft.get("name", customer?.name ?? ""));
  const [mobile, setMobile] = useState(draft.get("mobile", customer?.mobile_number ?? ""));
  const [alternate, setAlternate] = useState(draft.get("alternate", customer?.alternate_mobile ?? ""));
  const [model, setModel] = useState(draft.get("model", ""));
  const [registration, setRegistration] = useState(draft.get("registration", ""));
  const [elsewhere, setElsewhere] = useState<boolean>(draft.get("elsewhere", false));
  const [dealer, setDealer] = useState(draft.get("dealer", ""));
  const [purchase, setPurchase] = useState<string | null>(draft.get("purchase", todayISO()));
  const chooseElsewhere = (value: boolean) => {
    setElsewhere(value);
    setPurchase(value ? null : todayISO()); // usually not known for another dealer
  };
  const [nextDate, setNextDate] = useState<string | null>(draft.get("nextDate", null));
  const serviceTypes = useScheduleTypeNames(); // a repair is never the next service
  const [nextType, setNextType] = useState(draft.get("nextType", serviceTypes[0]));
  useAutosaveDraft(draftKey, { name, mobile, alternate, model, registration, elsewhere, dealer, purchase, nextDate, nextType });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const addVehicle = useAddVehicle();

  const withBike = !editing && (model.trim() !== "" || registration.trim() !== "");

  async function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter the customer's name.";
    if (digits(mobile).length < 10) next.mobile = "Enter a 10-digit mobile number.";
    if (alternate.trim() && digits(alternate).length < 10) next.alternate = "Enter a 10-digit number, or leave it empty.";
    else if (alternate.trim() && digits(alternate).slice(-10) === digits(mobile).slice(-10))
      next.alternate = "Same as the main number.";
    if (withBike) {
      if (!model.trim()) next.model = "Enter the bike model.";
      if (!registration.trim()) next.registration = "Enter the registration number.";
      if (!nextDate && !elsewhere) next.nextDate = "Pick when its next service is due.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    if (editing) {
      await update.mutateAsync({ id: customer.id, name: name.trim(), mobile_number: mobile, alternate_mobile: alternate.trim() });
      draft.clear();
      onOpenChange(false);
      return;
    }
    if (withBike) {
      await addVehicle.mutateAsync({
        name: name.trim(),
        mobile_number: mobile,
        alternate_mobile: alternate.trim() || null,
        model: model.trim(),
        registration_number: registration,
        purchase_date: purchase,
        bought_elsewhere: elsewhere,
        dealer_name: elsewhere ? dealer.trim() || null : null,
        // Another dealer: the next service is set at its first visit here.
        ...(!elsewhere && { next_service_date: nextDate!, next_service_type: nextType }),
      });
      draft.clear();
      onOpenChange(false);
      return;
    }
    const result = await create.mutateAsync({ name: name.trim(), mobile_number: mobile, alternate_mobile: alternate.trim() || null });
    draft.clear();
    onOpenChange(false);
    if (result?.id) onCreated?.(Number(result.id));
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit customer" : "Add customer"}
      description={editing ? "Update contact details." : "Add a customer, optionally with the bike they bought."}
      submitLabel={editing ? "Save changes" : withBike ? "Add customer & bike" : "Add customer"}
      pending={create.isPending || update.isPending || addVehicle.isPending}
      onSubmit={() => submit().catch(() => {})}
      wide={!editing}
      draft={draft}
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.name} className="sm:col-span-2">
            <FieldLabel htmlFor="c-name">Full name</FieldLabel>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Karthik Raja" aria-invalid={!!errors.name} autoFocus />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field data-invalid={!!errors.mobile}>
            <FieldLabel htmlFor="c-mobile">Mobile number</FieldLabel>
            <Input id="c-mobile" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98765 43210" aria-invalid={!!errors.mobile} />
            <FieldDescription>The agent calls this number.</FieldDescription>
            <FieldError>{errors.mobile}</FieldError>
          </Field>
          <Field data-invalid={!!errors.alternate}>
            <FieldLabel htmlFor="c-alt">Alternate number</FieldLabel>
            <Input id="c-alt" inputMode="tel" value={alternate} onChange={(e) => setAlternate(e.target.value)} placeholder="Optional" aria-invalid={!!errors.alternate} />
            <FieldDescription>A second number, e.g. a family member&rsquo;s.</FieldDescription>
            <FieldError>{errors.alternate}</FieldError>
          </Field>
        </div>
        {!editing && (
          <>
            <FieldSeparator>Bike (optional)</FieldSeparator>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.model}>
                <FieldLabel htmlFor="c-model">Model</FieldLabel>
                <ModelPicker id="c-model" value={model} onChange={setModel} invalid={!!errors.model} />
                <FieldError>{errors.model}</FieldError>
              </Field>
              <Field data-invalid={!!errors.registration}>
                <FieldLabel htmlFor="c-reg">Registration</FieldLabel>
                <Input id="c-reg" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} placeholder="TN 69 AB 1234" className="font-mono uppercase" aria-invalid={!!errors.registration} />
                <FieldError>{errors.registration}</FieldError>
              </Field>
              <BoughtFromField idPrefix="c" elsewhere={elsewhere} onElsewhereChange={chooseElsewhere} dealer={dealer} onDealerChange={setDealer} />
              <Field>
                <FieldLabel>Purchase date</FieldLabel>
                <DatePicker value={purchase} onChange={setPurchase} max={todayISO()} placeholder="Not known" clearLabel="Not known" />
              </Field>
              {elsewhere ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground sm:col-span-2">
                  Bought from another dealer: its next service is set when it first comes in here (a booking or a walk-in), so
                  the agent won&rsquo;t call about it until then.
                </p>
              ) : (
                <>
              <Field data-invalid={!!errors.nextDate}>
                <FieldLabel>{elsewhere ? "Next service due" : "First service due"}</FieldLabel>
                <DatePicker value={nextDate} onChange={setNextDate} invalid={!!errors.nextDate} />
                <FieldError>{errors.nextDate}</FieldError>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel>Service type</FieldLabel>
                <Select value={nextType} onValueChange={setNextType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>The agent will call about this service when it’s due.</FieldDescription>
              </Field>
                </>
              )}
            </div>
          </>
        )}
      </FieldGroup>
    </FormDialog>
  );
}
