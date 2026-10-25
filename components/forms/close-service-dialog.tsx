"use client";

import { addDays } from "date-fns";
import { FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAutosaveDraft, useFormDraft } from "@/lib/drafts";
import { formatDay, todayISO, toISO } from "@/lib/format";
import { DELIVERY_CHECKS, FEEDBACK_CHECKS, FEEDBACK_RATINGS, JOB_TYPES, JOBS_DONE, rupees } from "@/lib/job-card";
import { nextScheduledType, useCloseService, useServiceTypeNames, useServiceTypes, useVehicles } from "@/lib/queries";
import type { Appointment, JobCardFeedback } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_INTERVAL_DAYS = 90;
const MAX_PDF_MB = 10; // database.MAX_PDF_BYTES

// Table rows are edited as text, then sent as numbers.
interface PartRow { part_no: string; name: string; qty: string; amount: string; warranty: boolean }
interface LabourRow { description: string; amount: string }
const emptyPart = (): PartRow => ({ part_no: "", name: "", qty: "1", amount: "", warranty: false });
const emptyLabour = (): LabourRow => ({ description: "", amount: "" });

const isWhole = (v: string) => /^\d+$/.test(v.trim());
const num = (v: string) => (isWhole(v) ? Number(v.trim()) : 0);
const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const toggle = (list: string[], item: string, on: boolean) => (on ? [...list, item] : list.filter((x) => x !== item));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <FieldSeparator>{title}</FieldSeparator>
      {children}
    </>
  );
}

/** Workshop: close a booking with its job card (Arul Motors' Yamaha job card
 * fields + the scanned PDF). Saves a maintenance record and moves the bike on. */
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
  const { data: vehicles } = useVehicles();
  const serviceTypes = useServiceTypeNames();
  const close = useCloseService();
  const fileInput = useRef<HTMLInputElement>(null);
  const bike = vehicles?.find((v) => v.id === appointment?.vehicle_id);

  // Mounted only while open. Everything typed comes back after an accidental
  // close; a chosen file can't be kept by the browser, so the PDF is re-attached.
  const draftKey = `close:${appointment?.id ?? ""}`;
  const draft = useFormDraft(draftKey);
  const today = todayISO();
  const booked = appointment?.appointment_date ?? today;
  const bookedType = appointment?.service_type ?? "";
  const isFree = types?.find((t) => t.name === bookedType)?.is_free;

  const [jobCardNo, setJobCardNo] = useState(draft.get("jobCardNo", ""));
  const [jobType, setJobType] = useState(draft.get("jobType", isFree === false ? "Paid service" : "Free service"));
  const [serviceType, setServiceType] = useState(draft.get("serviceType", bookedType));
  const [receivedDate, setReceivedDate] = useState<string | null>(draft.get("receivedDate", booked <= today ? booked : today));
  const [deliveredDate, setDeliveredDate] = useState<string | null>(draft.get("deliveredDate", today));
  const [odometer, setOdometer] = useState(draft.get("odometer", ""));
  const [frame, setFrame] = useState<string | null>(draft.get("frame", null)); // null = from the bike
  const [engine, setEngine] = useState<string | null>(draft.get("engine", null));
  const [requests, setRequests] = useState(draft.get("requests", ""));
  const [jobsDone, setJobsDone] = useState<string[]>(draft.get("jobsDone", []));
  const [workDone, setWorkDone] = useState(draft.get("workDone", ""));
  const [parts, setParts] = useState<PartRow[]>(draft.get("parts", [emptyPart()]));
  const [labour, setLabour] = useState<LabourRow[]>(draft.get("labour", []));
  const [checks, setChecks] = useState<string[]>(draft.get("checks", []));
  const [feedback, setFeedback] = useState<JobCardFeedback>(draft.get("feedback", {}));
  const [technician, setTechnician] = useState(draft.get("technician", ""));
  const [mechanic, setMechanic] = useState(draft.get("mechanic", ""));
  const [supervisor, setSupervisor] = useState(draft.get("supervisor", ""));
  const [remarks, setRemarks] = useState(draft.get("remarks", ""));
  // Next service: suggested from the schedule (Service types), counted from
  // the delivery date, until staff pick something else.
  const [nextTypeChoice, setNextType] = useState<string | null>(draft.get("nextType", null));
  const [nextDateChoice, setNextDate] = useState<string | null | undefined>(draft.get("nextDate", undefined));
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useAutosaveDraft(draftKey, {
    jobCardNo, jobType, serviceType, receivedDate, deliveredDate, odometer, frame, engine, requests,
    jobsDone, workDone, parts, labour, checks, feedback, technician, mechanic, supervisor, remarks,
    nextType: nextTypeChoice, nextDate: nextDateChoice,
  });

  const frameValue = frame ?? bike?.frame_number ?? "";
  const engineValue = engine ?? bike?.engine_number ?? "";
  const usedParts = parts.filter((p) => p.name.trim() || p.part_no.trim() || p.amount.trim());
  const usedLabour = labour.filter((l) => l.description.trim() || l.amount.trim());
  const partsTotal = usedParts.reduce((sum, p) => sum + (p.warranty ? 0 : num(p.qty) * num(p.amount)), 0);
  const labourTotal = usedLabour.reduce((sum, l) => sum + num(l.amount), 0);

  const from = deliveredDate ?? today;
  const intervalFor = (name: string) => types?.find((t) => t.name === name)?.interval_days ?? DEFAULT_INTERVAL_DAYS;
  const suggested = nextScheduledType(types, serviceType);
  const nextType = nextTypeChoice ?? suggested?.name ?? serviceType;
  const nextDate = nextDateChoice !== undefined ? nextDateChoice : toISO(addDays(new Date(`${from}T00:00:00`), intervalFor(nextType)));
  const chooseNextType = (name: string) => {
    setNextType(name);
    setNextDate(toISO(addDays(new Date(`${from}T00:00:00`), intervalFor(name))));
  };

  const setPart = (i: number, patch: Partial<PartRow>) => setParts((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setLabourRow = (i: number, patch: Partial<LabourRow>) => setLabour((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

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
    if (!deliveredDate) next.deliveredDate = "Pick the delivery date.";
    else if (deliveredDate > today) next.deliveredDate = "Can't be in the future.";
    if (receivedDate && deliveredDate && receivedDate > deliveredDate) next.receivedDate = "Received after delivery?";
    if (!odometer.trim()) next.odometer = "Enter the odometer reading.";
    else if (!isWhole(odometer)) next.odometer = "Whole kilometres.";
    usedParts.forEach((p, i) => {
      if (!p.name.trim()) next.parts = `Part ${i + 1}: enter the part name.`;
      else if (!isWhole(p.qty) || num(p.qty) < 1) next.parts = `Part ${i + 1}: quantity must be 1 or more.`;
      else if (p.amount.trim() && !isWhole(p.amount)) next.parts = `Part ${i + 1}: amount in whole rupees.`;
    });
    usedLabour.forEach((l, i) => {
      if (!l.description.trim()) next.labour = `Labour ${i + 1}: enter the description.`;
      else if (l.amount.trim() && !isWhole(l.amount)) next.labour = `Labour ${i + 1}: amount in whole rupees.`;
    });
    if (!jobsDone.length && !workDone.trim() && !usedParts.length && !usedLabour.length)
      next.work = "Tick the jobs done, add parts or labour, or describe the work.";
    if (!file) next.file = errors.file ?? "Attach the scanned job card (PDF).";
    if (nextDate && deliveredDate && nextDate <= deliveredDate) next.nextDate = "Must be after this service.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const form = new FormData();
    const add = (key: string, value: string | null | undefined) => value && value.trim() && form.append(key, value.trim());
    add("service_date", deliveredDate);
    add("received_date", receivedDate);
    add("service_type", serviceType);
    add("job_type", jobType);
    add("job_card_no", jobCardNo);
    add("odometer_km", odometer);
    add("frame_number", frameValue);
    add("engine_number", engineValue);
    add("customer_requests", requests);
    add("work_done", workDone);
    form.append("jobs_done", JSON.stringify(jobsDone));
    form.append("parts", JSON.stringify(usedParts.map((p) => ({
      part_no: p.part_no.trim() || null, name: p.name.trim(), qty: num(p.qty), amount: num(p.amount), warranty: p.warranty,
    }))));
    form.append("labour", JSON.stringify(usedLabour.map((l) => ({ description: l.description.trim(), amount: num(l.amount) }))));
    form.append("delivery_checks", JSON.stringify(checks));
    form.append("feedback", JSON.stringify(feedback));
    add("technician", technician);
    add("mechanic", mechanic);
    add("supervisor", supervisor);
    add("remarks", remarks);
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
      xl
    >
      <FieldGroup>
        <Section title="Job">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="cs-card">Job card no.</FieldLabel>
              <Input id="cs-card" value={jobCardNo} onChange={(e) => setJobCardNo(e.target.value)} placeholder="e.g. 6862" />
            </Field>
            <Field>
              <FieldLabel>Type of job</FieldLabel>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Service</FieldLabel>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions(serviceType).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!!errors.receivedDate}>
              <FieldLabel>Received on</FieldLabel>
              <DatePicker value={receivedDate} onChange={setReceivedDate} max={today} invalid={!!errors.receivedDate} />
              <FieldError>{errors.receivedDate}</FieldError>
            </Field>
            <Field data-invalid={!!errors.deliveredDate}>
              <FieldLabel>Delivered on</FieldLabel>
              <DatePicker value={deliveredDate} onChange={setDeliveredDate} max={today} invalid={!!errors.deliveredDate} />
              <FieldError>{errors.deliveredDate}</FieldError>
            </Field>
            <Field data-invalid={!!errors.odometer}>
              <FieldLabel htmlFor="cs-km">Odometer (km)</FieldLabel>
              <Input id="cs-km" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="e.g. 3158" aria-invalid={!!errors.odometer} />
              <FieldError>{errors.odometer}</FieldError>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="cs-frame">Frame no.</FieldLabel>
              <Input id="cs-frame" value={frameValue} onChange={(e) => setFrame(e.target.value.toUpperCase())} placeholder="Chassis number" className="font-mono uppercase" />
            </Field>
            <Field>
              <FieldLabel htmlFor="cs-engine">Engine no.</FieldLabel>
              <Input id="cs-engine" value={engineValue} onChange={(e) => setEngine(e.target.value.toUpperCase())} placeholder="Optional" className="font-mono uppercase" />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="cs-req">Customer complaints / requests</FieldLabel>
            <Textarea id="cs-req" rows={2} value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="e.g. Oil change, general checkup, water wash, brake & air check" />
          </Field>
        </Section>

        <Section title="Work done">
          <Field data-invalid={!!errors.work}>
            <div className="grid gap-2 sm:grid-cols-4">
              {JOBS_DONE.map((job) => (
                <label key={job} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={jobsDone.includes(job)} onCheckedChange={(on) => setJobsDone((list) => toggle(list, job, on === true))} />
                  {job}
                </label>
              ))}
            </div>
            <Textarea rows={2} value={workDone} onChange={(e) => setWorkDone(e.target.value)} placeholder="Other work / supervisor observations (optional)" className="mt-2" />
            <FieldError>{errors.work}</FieldError>
          </Field>
        </Section>

        <Section title="Parts & labour">
          <Field data-invalid={!!errors.parts}>
            <FieldLabel>Parts replaced / repaired</FieldLabel>
            <div className="space-y-2">
              <div className="hidden grid-cols-[8rem_1fr_4rem_6rem_5.5rem_2rem] gap-2 text-xs text-muted-foreground sm:grid">
                <span>Part no.</span><span>Part name</span><span>Qty</span><span>₹ each</span><span>Warranty</span><span />
              </div>
              {parts.map((p, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[8rem_1fr_4rem_6rem_5.5rem_2rem] sm:items-center">
                  <Input value={p.part_no} onChange={(e) => setPart(i, { part_no: e.target.value.toUpperCase() })} placeholder="Part no." className="font-mono" aria-label={`Part ${i + 1} number`} />
                  <Input value={p.name} onChange={(e) => setPart(i, { name: e.target.value })} placeholder="Part name" aria-label={`Part ${i + 1} name`} />
                  <Input inputMode="numeric" value={p.qty} onChange={(e) => setPart(i, { qty: e.target.value })} aria-label={`Part ${i + 1} quantity`} />
                  <Input inputMode="numeric" value={p.amount} onChange={(e) => setPart(i, { amount: e.target.value })} placeholder="₹" aria-label={`Part ${i + 1} amount`} />
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={p.warranty} onCheckedChange={(on) => setPart(i, { warranty: on === true })} /> Warranty
                  </label>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setParts((rows) => rows.filter((_, j) => j !== i))} aria-label={`Remove part ${i + 1}`}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setParts((rows) => [...rows, emptyPart()])}>
                <Plus /> Add part
              </Button>
            </div>
            <FieldError>{errors.parts}</FieldError>
          </Field>
          <Field data-invalid={!!errors.labour}>
            <FieldLabel>Labour</FieldLabel>
            <div className="space-y-2">
              {labour.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_6rem_2rem] items-center gap-2">
                  <Input value={l.description} onChange={(e) => setLabourRow(i, { description: e.target.value })} placeholder="Description" aria-label={`Labour ${i + 1} description`} />
                  <Input inputMode="numeric" value={l.amount} onChange={(e) => setLabourRow(i, { amount: e.target.value })} placeholder="₹" aria-label={`Labour ${i + 1} amount`} />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setLabour((rows) => rows.filter((_, j) => j !== i))} aria-label={`Remove labour ${i + 1}`}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setLabour((rows) => [...rows, emptyLabour()])}>
                <Plus /> Add labour
              </Button>
            </div>
            <FieldError>{errors.labour}</FieldError>
          </Field>
          <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Parts <span className="tabular font-medium text-foreground">{rupees(partsTotal)}</span></span>
            <span className="text-muted-foreground">Labour <span className="tabular font-medium text-foreground">{rupees(labourTotal)}</span></span>
            <span className="font-semibold">Total <span className="tabular">{rupees(partsTotal + labourTotal)}</span></span>
          </div>
          <FieldDescription>Warranty parts aren&rsquo;t charged. Amounts are for staff; the voice agent never quotes prices.</FieldDescription>
        </Section>

        <Section title="Delivery & feedback">
          <div className="grid gap-2 sm:grid-cols-2">
            {DELIVERY_CHECKS.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <Checkbox checked={checks.includes(c)} onCheckedChange={(on) => setChecks((list) => toggle(list, c, on === true))} />
                {c}
              </label>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Customer feedback</FieldLabel>
              <Select value={feedback.rating ?? ""} onValueChange={(rating) => setFeedback((f) => ({ ...f, rating: rating || undefined }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Not asked" /></SelectTrigger>
                <SelectContent>
                  {FEEDBACK_RATINGS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="space-y-2">
              {FEEDBACK_CHECKS.map(({ key, label, yes, no }) => (
                <div key={key} className="flex items-center justify-between gap-2 text-sm">
                  <span>{label}</span>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={feedback[key] === undefined ? "" : feedback[key] ? "yes" : "no"}
                    onValueChange={(v) => setFeedback((f) => ({ ...f, [key]: v === "" ? undefined : v === "yes" }))}
                  >
                    <ToggleGroupItem value="yes">{yes}</ToggleGroupItem>
                    <ToggleGroupItem value="no">{no}</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="People & job card">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="cs-tech">Bay / technician</FieldLabel>
              <Input id="cs-tech" value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Optional" />
            </Field>
            <Field>
              <FieldLabel htmlFor="cs-mech">Mechanic</FieldLabel>
              <Input id="cs-mech" value={mechanic} onChange={(e) => setMechanic(e.target.value)} placeholder="Optional" />
            </Field>
            <Field>
              <FieldLabel htmlFor="cs-sup">Supervisor</FieldLabel>
              <Input id="cs-sup" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="cs-remarks">Remarks</FieldLabel>
            <Input id="cs-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional, e.g. rear tyre wear noted" />
          </Field>
          <Field data-invalid={!!errors.file}>
            <FieldLabel>Scanned job card (PDF)</FieldLabel>
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
                <span className="font-medium text-foreground">Choose or drop the scanned job card (PDF)</span>
                <span>Up to {MAX_PDF_MB} MB{draft.restored ? " · attach it again after reopening" : ""}</span>
              </button>
            )}
            <FieldError>{errors.file}</FieldError>
          </Field>
        </Section>

        <Section title="Next service">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Next service type</FieldLabel>
              <Select value={nextType} onValueChange={chooseNextType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions(nextType).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!!errors.nextDate}>
              <FieldLabel>Next service due</FieldLabel>
              <DatePicker value={nextDate} onChange={setNextDate} min={from} invalid={!!errors.nextDate} />
              <FieldError>{errors.nextDate}</FieldError>
            </Field>
          </div>
          <FieldDescription>The bike moves to this service, and the agent follows up when it&rsquo;s due.</FieldDescription>
        </Section>
      </FieldGroup>
    </FormDialog>
  );
}
