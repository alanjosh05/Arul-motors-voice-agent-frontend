"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayISO } from "@/lib/format";
import { useAddVehicle, useCreateCustomer, useServiceTypeNames, useUpdateCustomer } from "@/lib/queries";
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
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [model, setModel] = useState("");
  const [registration, setRegistration] = useState("");
  const [purchase, setPurchase] = useState<string | null>(todayISO());
  const [nextDate, setNextDate] = useState<string | null>(null);
  const serviceTypes = useServiceTypeNames();
  const [nextType, setNextType] = useState(serviceTypes[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const addVehicle = useAddVehicle();

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? "");
    setMobile(customer?.mobile_number ?? "");
    setModel("");
    setRegistration("");
    setPurchase(todayISO());
    setNextDate(null);
    setNextType(serviceTypes[0]);
    setErrors({});
  }, [open, customer]);

  const withBike = !editing && (model.trim() !== "" || registration.trim() !== "");

  async function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter the customer's name.";
    if (digits(mobile).length < 10) next.mobile = "Enter a 10-digit mobile number.";
    if (withBike) {
      if (!model.trim()) next.model = "Enter the bike model.";
      if (!registration.trim()) next.registration = "Enter the registration number.";
      if (!nextDate) next.nextDate = "Pick when the first service is due.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    if (editing) {
      await update.mutateAsync({ id: customer.id, name: name.trim(), mobile_number: mobile });
      onOpenChange(false);
      return;
    }
    if (withBike) {
      await addVehicle.mutateAsync({
        name: name.trim(),
        mobile_number: mobile,
        model: model.trim(),
        registration_number: registration,
        purchase_date: purchase,
        next_service_date: nextDate!,
        next_service_type: nextType,
      });
      onOpenChange(false);
      return;
    }
    const result = await create.mutateAsync({ name: name.trim(), mobile_number: mobile });
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
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="c-name">Full name</FieldLabel>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Karthik Raja" aria-invalid={!!errors.name} autoFocus />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field data-invalid={!!errors.mobile}>
            <FieldLabel htmlFor="c-mobile">Mobile number</FieldLabel>
            <Input id="c-mobile" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98765 43210" aria-invalid={!!errors.mobile} />
            <FieldError>{errors.mobile}</FieldError>
          </Field>
        </div>
        {!editing && (
          <>
            <FieldSeparator>First bike (optional)</FieldSeparator>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.model}>
                <FieldLabel htmlFor="c-model">Model</FieldLabel>
                <Input id="c-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Yamaha FZ-S Fi" aria-invalid={!!errors.model} />
                <FieldError>{errors.model}</FieldError>
              </Field>
              <Field data-invalid={!!errors.registration}>
                <FieldLabel htmlFor="c-reg">Registration</FieldLabel>
                <Input id="c-reg" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} placeholder="TN 69 AB 1234" className="font-mono uppercase" aria-invalid={!!errors.registration} />
                <FieldError>{errors.registration}</FieldError>
              </Field>
              <Field>
                <FieldLabel>Purchase date</FieldLabel>
                <DatePicker value={purchase} onChange={setPurchase} max={todayISO()} />
              </Field>
              <Field data-invalid={!!errors.nextDate}>
                <FieldLabel>First service due</FieldLabel>
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
                <FieldDescription>The agent will call about this service when it's due.</FieldDescription>
              </Field>
            </div>
          </>
        )}
      </FieldGroup>
    </FormDialog>
  );
}
