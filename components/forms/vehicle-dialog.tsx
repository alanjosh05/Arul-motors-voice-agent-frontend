"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayISO } from "@/lib/format";
import { useAddVehicle, useServiceTypeNames, useUpdateVehicle } from "@/lib/queries";
import type { Customer, Vehicle } from "@/lib/types";

/** Add a bike to a customer, or edit an existing bike. */
export function VehicleDialog({
  open,
  onOpenChange,
  customer,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Pick<Customer, "name" | "mobile_number">;
  vehicle?: Vehicle;
}) {
  const editing = !!vehicle;
  const [model, setModel] = useState("");
  const [registration, setRegistration] = useState("");
  const [purchase, setPurchase] = useState<string | null>(null);
  const [lastService, setLastService] = useState<string | null>(null);
  const [odometer, setOdometer] = useState("");
  const [nextDate, setNextDate] = useState<string | null>(null);
  const serviceTypes = useServiceTypeNames();
  const [nextType, setNextType] = useState(serviceTypes[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const add = useAddVehicle();
  const update = useUpdateVehicle();

  useEffect(() => {
    if (!open) return;
    setModel(vehicle?.model ?? "");
    setRegistration(vehicle?.registration_number ?? "");
    setPurchase(vehicle?.purchase_date ?? todayISO());
    setLastService(vehicle?.last_service_date ?? null);
    setOdometer(vehicle?.odometer_km != null ? String(vehicle.odometer_km) : "");
    setNextDate(vehicle?.next_service_date ?? null);
    setNextType(vehicle?.next_service_type ?? serviceTypes[0]);
    setErrors({});
  }, [open, vehicle]);

  async function submit() {
    const next: Record<string, string> = {};
    if (!model.trim()) next.model = "Enter the bike model.";
    if (!registration.trim()) next.registration = "Enter the registration number.";
    if (!nextDate) next.nextDate = "Pick when the next service is due.";
    if (odometer && !/^\d+$/.test(odometer)) next.odometer = "Kilometres as a whole number.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const fields = {
      model: model.trim(),
      registration_number: registration,
      purchase_date: purchase,
      last_service_date: lastService,
      odometer_km: odometer ? Number(odometer) : null,
      next_service_date: nextDate!,
      next_service_type: nextType,
    };
    if (editing) await update.mutateAsync({ id: vehicle.id, ...fields });
    else await add.mutateAsync({ ...fields, name: customer!.name, mobile_number: customer!.mobile_number });
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit bike" : "Add bike"}
      description={editing ? `${vehicle.model} · ${vehicle.registration_number}` : customer ? `For ${customer.name}` : undefined}
      submitLabel={editing ? "Save changes" : "Add bike"}
      pending={add.isPending || update.isPending}
      onSubmit={() => submit().catch(() => {})}
      wide
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.model}>
            <FieldLabel htmlFor="v-model">Model</FieldLabel>
            <Input id="v-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Yamaha R15 V4" aria-invalid={!!errors.model} />
            <FieldError>{errors.model}</FieldError>
          </Field>
          <Field data-invalid={!!errors.registration}>
            <FieldLabel htmlFor="v-reg">Registration</FieldLabel>
            <Input id="v-reg" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} placeholder="TN 69 AB 1234" className="font-mono uppercase" aria-invalid={!!errors.registration} />
            <FieldError>{errors.registration}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Purchase date</FieldLabel>
            <DatePicker value={purchase} onChange={setPurchase} max={todayISO()} />
          </Field>
          <Field>
            <FieldLabel>Last service</FieldLabel>
            <DatePicker value={lastService} onChange={setLastService} max={todayISO()} placeholder="Never serviced" />
          </Field>
          <Field data-invalid={!!errors.odometer}>
            <FieldLabel htmlFor="v-km">Odometer (km)</FieldLabel>
            <Input id="v-km" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="1200" aria-invalid={!!errors.odometer} />
            <FieldError>{errors.odometer}</FieldError>
          </Field>
          <Field data-invalid={!!errors.nextDate}>
            <FieldLabel>Next service due</FieldLabel>
            <DatePicker value={nextDate} onChange={setNextDate} invalid={!!errors.nextDate} />
            <FieldError>{errors.nextDate}</FieldError>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Next service type</FieldLabel>
            <Select value={nextType} onValueChange={setNextType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([...serviceTypes, nextType])].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
