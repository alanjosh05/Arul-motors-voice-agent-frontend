"use client";

import { addDays } from "date-fns";
import { FileText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAutosaveDraft, useFormDraft } from "@/lib/drafts";
import { formatDay, todayISO, toISO } from "@/lib/format";
import { nextScheduledType, useCloseService, useServiceTypeNames, useServiceTypes } from "@/lib/queries";
import type { Appointment } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_INTERVAL_DAYS = 90;
const MAX_PDF_MB = 10; // database.MAX_PDF_BYTES

const isWhole = (v: string) => /^\d+$/.test(v.trim());
const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** Workshop: close a booking with what was done and the service report PDF.
 * Saves a maintenance record and moves the bike on to its next service. */
export function CloseServiceDialog({
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
  const close = useCloseService();
  const fileInput = useRef<HTMLInputElement>(null);

  // Mounted only while open. Text fields come back after an accidental close;
  // a chosen file can't be kept by the browser, so the PDF is attached again.
  const draftKey = `close:${appointment?.id ?? ""}`;
  const draft = useFormDraft(draftKey);
  const today = todayISO();
  const booked = appointment?.appointment_date ?? today;
  const [serviceDate, setServiceDate] = useState<string | null>(draft.get("serviceDate", booked <= today ? booked : today));
  const [serviceType, setServiceType] = useState(draft.get("serviceType", appointment?.service_type ?? ""));
  const [odometer, setOdometer] = useState(draft.get("odometer", ""));
  const [workDone, setWorkDone] = useState(draft.get("workDone", ""));
  const [parts, setParts] = useState(draft.get("parts", ""));
  const [amount, setAmount] = useState(draft.get("amount", ""));
  const [technician, setTechnician] = useState(draft.get("technician", ""));
  const [remarks, setRemarks] = useState(draft.get("remarks", ""));
  // What staff picked for the next service; until then it's suggested from
  // the schedule (Service types), counted from the service date.
  const [nextTypeChoice, setNextType] = useState<string | null>(draft.get("nextType", null));
  const [nextDateChoice, setNextDate] = useState<string | null | undefined>(draft.get("nextDate", undefined));
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useAutosaveDraft(draftKey, {
    serviceDate, serviceType, odometer, workDone, parts, amount, technician, remarks,
    nextType: nextTypeChoice, nextDate: nextDateChoice,
  });

  const suggested = nextScheduledType(types, serviceType);
  const nextType = nextTypeChoice ?? suggested?.name ?? serviceType;
  const intervalFor = (name: string) => types?.find((t) => t.name === name)?.interval_days ?? DEFAULT_INTERVAL_DAYS;
  const nextDate =
    nextDateChoice !== undefined
      ? nextDateChoice
      : toISO(addDays(new Date(`${serviceDate ?? today}T00:00:00`), intervalFor(nextType)));

  const chooseNextType = (name: string) => {
    setNextType(name);
    setNextDate(toISO(addDays(new Date(`${serviceDate ?? today}T00:00:00`), intervalFor(name))));
  };

  const pickFile = (picked: File | undefined | null) => {
    if (!picked) return;
    const isPdf = picked.type === "application/pdf" || picked.name.toLowerCase().endsWith(".pdf");
    const next = { ...errors };
    delete next.file;
    if (!isPdf) next.file = "Choose a PDF file.";
    else if (picked.size > MAX_PDF_MB * 1024 * 1024) next.file = `The PDF must be ${MAX_PDF_MB} MB or smaller.`;
    setErrors(next);
    setFile(next.file ? null : picked);
  };

  if (!appointment) return null;

  async function submit() {
    const next: Record<string, string> = {};
    if (!serviceDate) next.serviceDate = "Pick the date the service was done.";
    else if (serviceDate > today) next.serviceDate = "The service date can't be in the future.";
    if (!odometer.trim()) next.odometer = "Enter the odometer reading.";
    else if (!isWhole(odometer)) next.odometer = "Kilometres as a whole number.";
    if (!workDone.trim()) next.workDone = "Describe the work done.";
    if (amount.trim() && !isWhole(amount)) next.amount = "Amount in whole rupees.";
    if (!file) next.file = errors.file ?? "Attach the service report (PDF).";
    if (nextDate && serviceDate && nextDate <= serviceDate) next.nextDate = "The next service must be after this one.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const form = new FormData();
    form.append("service_date", serviceDate!);
    form.append("service_type", serviceType);
    form.append("odometer_km", odometer.trim());
    form.append("work_done", workDone.trim());
    if (parts.trim()) form.append("parts", parts.trim());
    if (amount.trim()) form.append("amount", amount.trim());
    if (technician.trim()) form.append("technician", technician.trim());
    if (remarks.trim()) form.append("remarks", remarks.trim());
    if (nextDate) {
      form.append("next_service_date", nextDate);
      form.append("next_service_type", nextType);
    }
    form.append("report", file!, file!.name);
    await close.mutateAsync({ id: appointment!.id, form });
    draft.clear();
    onOpenChange(false);
  }

  const typeOptions = (current: string) => [...new Set([...serviceTypes, ...(current ? [current] : [])])];

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      draft={draft}
      title="Close service"
      description={`${appointment.customer_name ?? ""} · ${appointment.model ?? ""} ${appointment.registration_number ?? ""} · booked ${formatDay(appointment.appointment_date)}`}
      submitLabel="Close service"
      pending={close.isPending}
      onSubmit={() => submit().catch(() => {})}
      wide
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.serviceDate}>
            <FieldLabel>Service date</FieldLabel>
            <DatePicker value={serviceDate} onChange={setServiceDate} max={today} invalid={!!errors.serviceDate} />
            <FieldError>{errors.serviceDate}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Service done</FieldLabel>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions(serviceType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={!!errors.odometer}>
            <FieldLabel htmlFor="cs-km">Odometer</FieldLabel>
            <InputGroup>
              <InputGroupInput id="cs-km" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="4200" aria-invalid={!!errors.odometer} />
              <InputGroupAddon align="inline-end">
                <InputGroupText>km</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldError>{errors.odometer}</FieldError>
          </Field>
        </div>

        <Field data-invalid={!!errors.workDone}>
          <FieldLabel htmlFor="cs-work">Work done</FieldLabel>
          <Textarea id="cs-work" rows={3} value={workDone} onChange={(e) => setWorkDone(e.target.value)} placeholder="e.g. Engine oil change, chain cleaned and lubricated, brakes adjusted" aria-invalid={!!errors.workDone} />
          <FieldError>{errors.workDone}</FieldError>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="cs-parts">Parts replaced</FieldLabel>
            <Input id="cs-parts" value={parts} onChange={(e) => setParts(e.target.value)} placeholder="Optional, e.g. oil filter, brake shoes" />
          </Field>
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="cs-amount">Amount charged</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>₹</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput id="cs-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Optional" aria-invalid={!!errors.amount} />
            </InputGroup>
            <FieldDescription>Staff only. The voice agent never quotes prices.</FieldDescription>
            <FieldError>{errors.amount}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="cs-tech">Technician</FieldLabel>
            <Input id="cs-tech" value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Optional" />
          </Field>
          <Field>
            <FieldLabel htmlFor="cs-remarks">Remarks</FieldLabel>
            <Input id="cs-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional, e.g. advise tyre change next time" />
          </Field>
        </div>

        <Field data-invalid={!!errors.file}>
          <FieldLabel>Service report (PDF)</FieldLabel>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = ""; // allow picking the same file again
            }}
          />
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <FileText className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{sizeLabel(file.size)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setFile(null)} aria-label="Remove file">
                <X />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-lg border border-dashed p-5 text-sm text-muted-foreground transition-colors hover:bg-muted/40",
                errors.file && "border-destructive",
              )}
            >
              <Upload className="size-5" />
              <span className="font-medium text-foreground">Choose or drop the job card / invoice PDF</span>
              <span>Up to {MAX_PDF_MB} MB{draft.restored ? " · attach it again after reopening" : ""}</span>
            </button>
          )}
          <FieldError>{errors.file}</FieldError>
        </Field>

        <FieldSeparator>Next service</FieldSeparator>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Next service type</FieldLabel>
            <Select value={nextType} onValueChange={chooseNextType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions(nextType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={!!errors.nextDate}>
            <FieldLabel>Next service due</FieldLabel>
            <DatePicker value={nextDate} onChange={setNextDate} min={serviceDate ?? today} invalid={!!errors.nextDate} />
            <FieldError>{errors.nextDate}</FieldError>
          </Field>
        </div>
        <FieldDescription>The bike moves to this service, and the agent follows up when it&rsquo;s due.</FieldDescription>
      </FieldGroup>
    </FormDialog>
  );
}
