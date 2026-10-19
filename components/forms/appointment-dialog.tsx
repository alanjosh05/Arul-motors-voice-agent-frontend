"use client";

import { addDays } from "date-fns";
import { useMemo, useState } from "react";
import { CustomerPicker } from "@/components/customer-picker";
import { DatePicker } from "@/components/date-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDay, todayISO, toISO } from "@/lib/format";
import { useCreateAppointment, useCustomers, useServiceTypeNames, useUpdateAppointment } from "@/lib/queries";
import type { Appointment } from "@/lib/types";

const MAX_DAYS_AHEAD = 30; // database.MAX_DAYS_AHEAD

/** Book a service date (new) or reschedule / edit notes (existing booking). */
export function AppointmentDialog({
  open,
  onOpenChange,
  customerId,
  vehicleId,
  appointment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: number;
  vehicleId?: number;
  appointment?: Appointment;
}) {
  const editing = !!appointment;
  const { data: customers = [] } = useCustomers();
  const serviceTypes = useServiceTypeNames();
  // Callers mount the dialog only while it's open, so each opening starts fresh.
  const [customer, setCustomer] = useState<number | null>(appointment?.customer_id ?? customerId ?? null);
  const [vehicleChoice, setVehicle] = useState(String(appointment?.vehicle_id ?? vehicleId ?? ""));
  const [date, setDate] = useState<string | null>(appointment?.appointment_date ?? null);
  const [typeChoice, setServiceType] = useState(appointment?.service_type ?? "");
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateAppointment();
  const update = useUpdateAppointment();

  const selected = useMemo(() => customers.find((c) => c.id === customer), [customers, customer]);
  // Default to the customer's first bike and its due service.
  const bike = editing
    ? undefined
    : (selected?.vehicles.find((v) => String(v.id) === vehicleChoice) ?? selected?.vehicles[0]);
  const vehicle = bike ? String(bike.id) : vehicleChoice;
  const serviceType = typeChoice || bike?.next_service_type || "";

  async function submit() {
    const next: Record<string, string> = {};
    if (!customer) next.customer = "Choose a customer.";
    if (!editing && selected && !selected.vehicles.length) next.customer = "This customer has no bike yet. Add one first.";
    if (!date) next.date = "Pick the date they'll bring the bike in.";
    setErrors(next);
    if (Object.keys(next).length) return;
    if (editing) {
      await update.mutateAsync({ id: appointment.id, appointment_date: date!, notes: notes.trim() || null });
    } else {
      await create.mutateAsync({
        customer_id: customer!,
        appointment_date: date!,
        registration_number: bike?.registration_number,
        service_type: serviceType || bike?.next_service_type,
        notes: notes.trim() || null,
      });
    }
    onOpenChange(false);
  }

  const today = todayISO();
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Reschedule ${appointment.id}` : "Book a service"}
      description={
        editing
          ? `${appointment.customer_name ?? ""} · ${appointment.model ?? ""} · now ${formatDay(appointment.appointment_date)}`
          : "No time slots: customers bring the bike in any time on the chosen day."
      }
      submitLabel={editing ? "Save changes" : "Book service"}
      pending={create.isPending || update.isPending}
      onSubmit={() => submit().catch(() => {})}
    >
      <FieldGroup>
        {!editing && (
          <Field data-invalid={!!errors.customer}>
            <FieldLabel>Customer</FieldLabel>
            <CustomerPicker customers={customers} value={customer} onChange={(id) => { setCustomer(id); setVehicle(""); setServiceType(""); }} invalid={!!errors.customer} />
            <FieldError>{errors.customer}</FieldError>
          </Field>
        )}
        {!editing && selected && selected.vehicles.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Bike</FieldLabel>
              <Select value={vehicle} onValueChange={(v) => { setVehicle(v); const b = selected.vehicles.find((x) => String(x.id) === v); if (b) setServiceType(b.next_service_type); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose bike" />
                </SelectTrigger>
                <SelectContent>
                  {selected.vehicles.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.model} · {v.registration_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Service</FieldLabel>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Service type" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([...serviceTypes, ...(serviceType ? [serviceType] : [])])].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}
        <Field data-invalid={!!errors.date}>
          <FieldLabel>Date</FieldLabel>
          <DatePicker value={date} onChange={setDate} min={today} max={toISO(addDays(new Date(), MAX_DAYS_AHEAD))} invalid={!!errors.date} />
          <FieldDescription>Within the next {MAX_DAYS_AHEAD} days.</FieldDescription>
          <FieldError>{errors.date}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="a-notes">Notes for the workshop</FieldLabel>
          <Textarea id="a-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. brake noise, chain adjustment" rows={3} />
        </Field>
      </FieldGroup>
    </FormDialog>
  );
}
