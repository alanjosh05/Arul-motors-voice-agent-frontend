"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { useScheduleTypeNames } from "@/lib/queries";

/** The services (from the Service types page) that apply to a customer: tick
 *  the ones to follow up. Only these become the customer's next services. */
export function ServicesField({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  const types = useScheduleTypeNames();
  const toggle = (name: string, on: boolean) =>
    onChange(types.filter((t) => (t === name ? on : value.includes(t))));
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>Services that apply</FieldLabel>
      <div className="grid gap-2 sm:grid-cols-2">
        {types.map((t) => (
          <label key={t} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[[data-checked]]:border-primary/50 has-[[data-checked]]:bg-primary/5">
            <Checkbox checked={value.includes(t)} onCheckedChange={(on) => toggle(t, on === true)} />
            {t}
          </label>
        ))}
      </div>
      <FieldDescription>Tick the services this customer gets. The agent calls only about these.</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
