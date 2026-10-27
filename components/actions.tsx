"use client";

import {
  CalendarClock,
  CalendarPlus,
  CircleCheck,
  CircleX,
  ExternalLink,
  NotebookPen,
  Pencil,
  PhoneCall,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { preloadCallCode, useCall } from "@/components/call/call-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RowAction, RowActions } from "@/components/row-action";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCancelAppointment, useDeleteCustomer, useVoiceEnabled } from "@/lib/queries";
import type { Appointment, Customer } from "@/lib/types";
import { AppointmentDialog, CloseServiceDialog, CustomerDialog, LogCallDialog } from "@/components/forms/lazy";

/** Primary "Call with agent" button (hidden while the voice agent is switched off). */
export function CallButton({
  customer,
  subtitle,
  size = "sm",
  label = "Call with agent",
  iconOnly,
}: {
  customer: { id: number; name: string; mobile_number?: string };
  subtitle?: string;
  size?: "sm" | "default" | "lg";
  label?: string;
  iconOnly?: boolean;
}) {
  const { startCall, target } = useCall();
  const voiceOn = useVoiceEnabled();
  if (!voiceOn) return null;
  const button = (
    <Button
      size={iconOnly ? "icon-sm" : size}
      disabled={!!target}
      onPointerEnter={preloadCallCode}
      onFocus={preloadCallCode}
      onClick={(e) => {
        e.stopPropagation();
        startCall({ id: customer.id, name: customer.name, mobile_number: customer.mobile_number, subtitle });
      }}
      aria-label={label}
    >
      <PhoneCall />
      {!iconOnly && label}
    </Button>
  );
  if (!iconOnly) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{target ? "A call is in progress" : label}</TooltipContent>
    </Tooltip>
  );
}

/** A booking's actions, side by side: close service (record + PDF),
 * reschedule, open customer, cancel. */
export function AppointmentActions({ appointment, showCustomerLink = true }: { appointment: Appointment; showCustomerLink?: boolean }) {
  const [dialog, setDialog] = useState<"reschedule" | "complete" | "cancel" | null>(null);
  const cancel = useCancelAppointment();
  const open = appointment.state === "upcoming" || appointment.state === "missed";
  return (
    <RowActions>
      {open && <RowAction label="Close service" icon={CircleCheck} onClick={() => setDialog("complete")} />}
      {open && <RowAction label="Reschedule" icon={CalendarClock} onClick={() => setDialog("reschedule")} />}
      {showCustomerLink && <RowAction label="View customer" icon={ExternalLink} href={`/customers/view/?id=${appointment.customer_id}`} />}
      {open && <RowAction label="Cancel booking" icon={CircleX} destructive onClick={() => setDialog("cancel")} />}
      {dialog === "reschedule" && <AppointmentDialog open={dialog === "reschedule"} onOpenChange={(o) => !o && setDialog(null)} appointment={appointment} />}
      {dialog === "complete" && <CloseServiceDialog open={dialog === "complete"} onOpenChange={(o) => !o && setDialog(null)} appointment={appointment} />}
      {dialog === "cancel" && <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Cancel booking ${appointment.id}?`}
        description="The booking is deleted completely and won't appear in the customer's history. The bike shows up in follow-ups again."
        confirmLabel="Cancel booking"
        destructive
        onConfirm={() => cancel.mutate(appointment.id)}
      />}
    </RowActions>
  );
}

/** A customer row's actions, side by side. */
export function CustomerActions({ customer }: { customer: Customer }) {
  const [dialog, setDialog] = useState<"edit" | "book" | "log" | "delete" | null>(null);
  const remove = useDeleteCustomer();
  const { startCall, target } = useCall();
  const voiceOn = useVoiceEnabled();
  return (
    <RowActions>
      {voiceOn && (
        <RowAction
          label="Call with agent"
          icon={PhoneCall}
          disabled={!!target}
          disabledReason="A call is in progress"
          onClick={() => startCall({ id: customer.id, name: customer.name, mobile_number: customer.mobile_number })}
        />
      )}
      <RowAction label="Book service" icon={CalendarPlus} onClick={() => setDialog("book")} />
      <RowAction label="Log a call" icon={NotebookPen} onClick={() => setDialog("log")} />
      <RowAction label="Open profile" icon={ExternalLink} href={`/customers/view/?id=${customer.id}`} />
      <RowAction label="Edit details" icon={Pencil} onClick={() => setDialog("edit")} />
      <RowAction label="Delete customer" icon={Trash2} destructive onClick={() => setDialog("delete")} />
      {dialog === "edit" && <CustomerDialog open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} customer={customer} />}
      {dialog === "book" && <AppointmentDialog open={dialog === "book"} onOpenChange={(o) => !o && setDialog(null)} customerId={customer.id} />}
      {dialog === "log" && <LogCallDialog
        open={dialog === "log"}
        onOpenChange={(o) => !o && setDialog(null)}
        customer={{ id: customer.id, name: customer.name, vehicleId: customer.vehicles[0]?.id }}
      />}
      {dialog === "delete" && <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Delete ${customer.name}?`}
        description="This permanently deletes the customer with their bikes, service bookings and call history."
        confirmLabel="Delete customer"
        destructive
        onConfirm={() => remove.mutate(customer.id)}
      />}
    </RowActions>
  );
}
