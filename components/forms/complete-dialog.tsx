"use client";

import { addDays } from "date-fns";
import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayISO, toISO } from "@/lib/format";
import { nextScheduledType, useCompleteAppointment, useServiceTypeNames, useServiceTypes } from "@/lib/queries";
import type { Appointment } from "@/lib/types";

const DEFAULT_INTERVAL_DAYS = 90;

/** Workshop: mark a booking serviced and set the bike's next due service. */
export function CompleteDialog({
  open,
  onOpenChange,
  appointment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment;
}) {
  const { data: types } = useServiceTypes();
  const serviceTypes = useServiceTypeNames();
  const complete = useCompleteAppointment();
  // What staff picked; until then, suggest the next scheduled type and its due
  // date (from Service types, which may still be loading).
  const [typeChoice, setNextType] = useState<string | null>(null);
  const [dateChoice, setNextDate] = useState<string | null | undefined>(undefined);
  const suggested = nextScheduledType(types, appointment?.service_type ?? "");
  const nextType = typeChoice ?? suggested?.name ?? appointment?.service_type ?? "";
  const nextDate =
    dateChoice !== undefined ? dateChoice : toISO(addDays(new Date(), suggested?.interval_days ?? DEFAULT_INTERVAL_DAYS));

  const chooseType = (name: string) => {
    setNextType(name);
    const chosen = types?.find((t) => t.name === name);
    if (chosen?.interval_days) setNextDate(toISO(addDays(new Date(), chosen.interval_days)));
  };

  if (!appointment) return null;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mark as serviced"
      description={`${appointment.customer_name ?? ""} · ${appointment.model ?? ""} · ${appointment.service_type}`}
      submitLabel="Mark serviced"
      pending={complete.isPending}
      onSubmit={() =>
        complete
          .mutateAsync({ id: appointment.id, next_service_date: nextDate, next_service_type: nextType })
          .then(() => onOpenChange(false))
          .catch(() => {})
      }
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Next service due</FieldLabel>
            <DatePicker value={nextDate} onChange={setNextDate} min={todayISO()} />
          </Field>
          <Field>
            <FieldLabel>Next service type</FieldLabel>
            <Select value={nextType} onValueChange={chooseType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([...serviceTypes, ...(nextType ? [nextType] : [])])].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <FieldDescription>The agent will follow up again when the next service comes due.</FieldDescription>
      </FieldGroup>
    </FormDialog>
  );
}
