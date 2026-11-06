"use client";

import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { BoughtFromField } from "@/components/forms/bought-from-field";
import { InsuranceFields, type InsuranceValue } from "@/components/forms/insurance-fields";
import { FormDialog } from "@/components/forms/form-dialog";
import { ModelPicker } from "@/components/model-picker";
import { useAutosaveDraft, useFormDraft } from "@/lib/drafts";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayISO } from "@/lib/format";
import { planNext, scheduledTypes } from "@/lib/service-plan";
import { useAddVehicle, useCustomers, useScheduleTypeNames, useServiceTypes, useUpdateVehicle } from "@/lib/queries";
import type { Customer, Vehicle } from "@/lib/types";

const NONE = "__none__";

/** Add a bike to a customer, or edit an existing bike. */
export function VehicleDialog({
  open,
  onOpenChange,
  customer,
  vehicle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Pick<Customer, "name" | "mobile_number"> & { service_types?: string[] };
  vehicle?: Vehicle;
}) {
  const editing = !!vehicle;
  // Mounted only while open: fields start from the record, or from what was
  // typed before if the form was closed without saving.
  const draftKey = editing ? `vehicle:${vehicle.id}` : `vehicle:new:${customer?.mobile_number ?? ""}`;
  const draft = useFormDraft(draftKey);
  const [model, setModel] = useState(draft.get("model", vehicle?.model ?? ""));
  const [registration, setRegistration] = useState(draft.get("registration", vehicle?.registration_number ?? ""));
  const [elsewhere, setElsewhere] = useState<boolean>(draft.get("elsewhere", !!vehicle?.bought_elsewhere));
  const [dealer, setDealer] = useState(draft.get("dealer", vehicle?.dealer_name ?? ""));
  const [purchase, setPurchase] = useState<string | null>(draft.get("purchase", editing ? vehicle.purchase_date : todayISO()));
  const chooseElsewhere = (value: boolean) => {
    setElsewhere(value);
    // A new bike from another dealer: purchase date usually not known.
    if (!editing) setPurchase(value ? null : todayISO());
  };
  const [lastService, setLastService] = useState<string | null>(draft.get("lastService", vehicle?.last_service_date ?? null));
  const [odometer, setOdometer] = useState(draft.get("odometer", vehicle?.odometer_km != null ? String(vehicle.odometer_km) : ""));
  const [frame, setFrame] = useState(draft.get("frame", vehicle?.frame_number ?? ""));
  const [engine, setEngine] = useState(draft.get("engine", vehicle?.engine_number ?? ""));
  const [lastType, setLastType] = useState<string>(draft.get("lastType", ""));
  // The next service is worked out from the last one; a typed value (or the
  // bike's saved one, when editing) overrides it until the last service changes.
  const [dateChoice, setDateChoice] = useState<string | null | undefined>(draft.get("nextDate", vehicle ? vehicle.next_service_date : undefined));
  const allTypes = useScheduleTypeNames(); // a repair is never the next service
  const { data: customers } = useCustomers();
  // Only the customer's ticked services can be the next one (all, if none are set).
  const checked = customer?.service_types ?? customers?.find((c) => c.id === vehicle?.customer_id)?.service_types;
  const serviceTypes = checked?.length ? allTypes.filter((t) => checked.includes(t)) : allTypes;
  const { data: typeList } = useServiceTypes();
  const [typeChoice, setTypeChoice] = useState<string | null>(draft.get("nextType", vehicle?.next_service_type ?? null));
  const plan = planNext({ types: typeList, allowed: checked, lastType, lastDate: lastService, purchase });
  const nextType = typeChoice ?? plan.type ?? serviceTypes[0];
  const nextDate = dateChoice !== undefined ? dateChoice : plan.dueFor(nextType);
  const resetNext = () => {
    setTypeChoice(null);
    setDateChoice(undefined);
  };
  const changeLastService = (value: string | null) => {
    setLastService(value);
    resetNext();
  };
  const changeLastType = (value: string) => {
    setLastType(value === NONE ? "" : value);
    resetNext();
  };
  const changeNextType = (value: string) => {
    setTypeChoice(value);
    setDateChoice(undefined); // its date follows the new type's interval
  };
  const [insurance, setInsurance] = useState<InsuranceValue>(
    draft.get("insurance", { provider: vehicle?.insurance_provider ?? "", policyNo: vehicle?.insurance_policy_no ?? "", expiry: vehicle?.insurance_expiry ?? null }),
  );
  useAutosaveDraft(draftKey, { insurance, model, registration, elsewhere, dealer, purchase, lastService, lastType, odometer, frame, engine, nextDate: dateChoice, nextType: typeChoice });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const add = useAddVehicle();
  const update = useUpdateVehicle();

  async function submit() {
    const next: Record<string, string> = {};
    if (!model.trim()) next.model = "Enter the bike model.";
    if (!registration.trim()) next.registration = "Enter the registration number.";
    // A new bike from another dealer: its next service is set at its first visit.
    const askNext = editing || !elsewhere;
    if (!nextDate && askNext) next.nextDate = "Pick when the next service is due.";
    if (odometer && !/^\d+$/.test(odometer)) next.odometer = "Kilometres as a whole number.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const fields = {
      model: model.trim(),
      registration_number: registration,
      // Editing: "" clears it (not known).
      purchase_date: editing ? (purchase ?? "") : purchase,
      bought_elsewhere: elsewhere,
      dealer_name: elsewhere ? dealer.trim() : "",
      last_service_date: lastService,
      odometer_km: odometer ? Number(odometer) : null,
      // "" clears (editing); empty is left out when adding.
      insurance_provider: insurance.provider.trim(),
      insurance_policy_no: insurance.policyNo.trim(),
      insurance_expiry: insurance.expiry ?? "",
      ...(askNext && { next_service_date: nextDate!, next_service_type: nextType }),
    };
    if (editing)
      await update.mutateAsync({
        id: vehicle.id,
        ...fields,
        // "" leaves a number as it is (the API ignores empty values).
        ...(frame.trim() && { frame_number: frame.trim().toUpperCase() }),
        ...(engine.trim() && { engine_number: engine.trim().toUpperCase() }),
      });
    else await add.mutateAsync({ ...fields, name: customer!.name, mobile_number: customer!.mobile_number });
    draft.clear();
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
      draft={draft}
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.model}>
            <FieldLabel htmlFor="v-model">Model</FieldLabel>
            <ModelPicker id="v-model" value={model} onChange={setModel} invalid={!!errors.model} />
            <FieldError>{errors.model}</FieldError>
          </Field>
          <Field data-invalid={!!errors.registration}>
            <FieldLabel htmlFor="v-reg">Registration</FieldLabel>
            <Input id="v-reg" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} placeholder="TN 69 AB 1234" className="font-mono uppercase" aria-invalid={!!errors.registration} />
            <FieldError>{errors.registration}</FieldError>
          </Field>
          <BoughtFromField idPrefix="v" elsewhere={elsewhere} onElsewhereChange={chooseElsewhere} dealer={dealer} onDealerChange={setDealer} />
          <Field>
            <FieldLabel>Purchase date</FieldLabel>
            <DatePicker value={purchase} onChange={setPurchase} max={todayISO()} placeholder="Not known" clearLabel="Not known" />
          </Field>
          <Field>
            <FieldLabel>Last service</FieldLabel>
            <DatePicker value={lastService} onChange={changeLastService} max={todayISO()} placeholder="Never serviced" />
          </Field>
          <Field>
            <FieldLabel>Last service type</FieldLabel>
            <Select value={lastType || NONE} onValueChange={changeLastType} disabled={!lastService}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Never serviced" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not known</SelectItem>
                {scheduledTypes(typeList).map((t) => (
                  <SelectItem key={t.name} value={t.name}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>Pick the last service date first. The next service is worked out from these.</FieldDescription>
          </Field>
          <Field data-invalid={!!errors.odometer}>
            <FieldLabel htmlFor="v-km">Odometer (km)</FieldLabel>
            <Input id="v-km" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="1200" aria-invalid={!!errors.odometer} />
            <FieldError>{errors.odometer}</FieldError>
          </Field>
          <InsuranceFields idPrefix="v" value={insurance} onChange={setInsurance} />
          {editing && (
            <>
              <Field>
                <FieldLabel htmlFor="v-frame">Frame no.</FieldLabel>
                <Input id="v-frame" value={frame} onChange={(e) => setFrame(e.target.value.toUpperCase())} placeholder="Chassis number" className="font-mono uppercase" />
              </Field>
              <Field>
                <FieldLabel htmlFor="v-engine">Engine no.</FieldLabel>
                <Input id="v-engine" value={engine} onChange={(e) => setEngine(e.target.value.toUpperCase())} placeholder="Optional" className="font-mono uppercase" />
              </Field>
            </>
          )}
          {!editing && elsewhere ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground sm:col-span-2">
              Bought from another dealer: its next service is set when it first comes in here (a booking or a walk-in), so the
              agent won&rsquo;t call about it until then.
            </p>
          ) : (
            <>
          <Field data-invalid={!!errors.nextDate}>
            <FieldLabel>Next service due</FieldLabel>
            <DatePicker value={nextDate} onChange={setDateChoice} invalid={!!errors.nextDate} />
            <FieldError>{errors.nextDate}</FieldError>
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Next service type</FieldLabel>
            <Select value={nextType} onValueChange={changeNextType}>
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
            </>
          )}
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
