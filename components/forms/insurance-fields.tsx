"use client";

import { DatePicker } from "@/components/date-picker";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export interface InsuranceValue {
  provider: string;
  policyNo: string;
  expiry: string | null;
}

/** A bike's insurance: company, policy number and expiry date (reminders
 *  start 30 days before it). All optional. */
export function InsuranceFields({ idPrefix, value, onChange }: { idPrefix: string; value: InsuranceValue; onChange: (v: InsuranceValue) => void }) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-ins-co`}>Insurance company</FieldLabel>
        <Input id={`${idPrefix}-ins-co`} value={value.provider} onChange={(e) => onChange({ ...value, provider: e.target.value })} placeholder="e.g. New India Assurance" />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-ins-no`}>Policy number</FieldLabel>
        <Input id={`${idPrefix}-ins-no`} value={value.policyNo} onChange={(e) => onChange({ ...value, policyNo: e.target.value.toUpperCase() })} placeholder="Optional" className="font-mono uppercase" />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel>Insurance expires on</FieldLabel>
        <DatePicker value={value.expiry} onChange={(expiry) => onChange({ ...value, expiry })} placeholder="Not added" clearLabel="Not added" />
        <FieldDescription>The Insurance page reminds you 30 days before this date.</FieldDescription>
      </Field>
    </>
  );
}
