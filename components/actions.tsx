"use client";

import {
  CalendarClock,
  CalendarPlus,
  CircleCheck,
  CircleX,
  Ellipsis,
  ExternalLink,
  NotebookPen,
  Pencil,
  PhoneCall,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { preloadCallCode, useCall } from "@/components/call/call-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCancelAppointment, useDeleteCustomer, useVoiceEnabled } from "@/lib/queries";
import type { Appointment, Customer } from "@/lib/types";
import { AppointmentDialog, CompleteDialog, CustomerDialog, LogCallDialog } from "@/components/forms/lazy";

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

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

/** ⋯ menu for a service booking: reschedule, mark serviced, cancel, open customer. */
export function AppointmentActions({ appointment, showCustomerLink = true }: { appointment: Appointment; showCustomerLink?: boolean }) {
  const [dialog, setDialog] = useState<"reschedule" | "complete" | "cancel" | null>(null);
  const cancel = useCancelAppointment();
  const open = appointment.state === "upcoming" || appointment.state === "missed";
  return (
    <div onClick={stop} className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Booking actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {open && (
            <>
              <DropdownMenuItem onClick={() => setDialog("complete")}>
                <CircleCheck /> Mark serviced
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog("reschedule")}>
                <CalendarClock /> Reschedule
              </DropdownMenuItem>
            </>
          )}
          {showCustomerLink && (
            <DropdownMenuItem asChild>
              <Link href={`/customers/view/?id=${appointment.customer_id}`}>
                <ExternalLink /> View customer
              </Link>
            </DropdownMenuItem>
          )}
          {open && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDialog("cancel")}>
                <CircleX /> Cancel booking
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === "reschedule" && <AppointmentDialog open={dialog === "reschedule"} onOpenChange={(o) => !o && setDialog(null)} appointment={appointment} />}
      {dialog === "complete" && <CompleteDialog open={dialog === "complete"} onOpenChange={(o) => !o && setDialog(null)} appointment={appointment} />}
      {dialog === "cancel" && <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Cancel booking ${appointment.id}?`}
        description="The booking is kept in the history as cancelled. The bike will show up in follow-ups again."
        confirmLabel="Cancel booking"
        destructive
        onConfirm={() => cancel.mutate(appointment.id)}
      />}
    </div>
  );
}

/** ⋯ menu for a customer row. */
export function CustomerActions({ customer }: { customer: Customer }) {
  const [dialog, setDialog] = useState<"edit" | "book" | "log" | "delete" | null>(null);
  const remove = useDeleteCustomer();
  const router = useRouter();
  const { startCall, target } = useCall();
  const voiceOn = useVoiceEnabled();
  return (
    <div onClick={stop} className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Customer actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {voiceOn && (
            <DropdownMenuItem
              disabled={!!target}
              onClick={() => startCall({ id: customer.id, name: customer.name, mobile_number: customer.mobile_number })}
            >
              <PhoneCall /> Call with agent
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setDialog("book")}>
            <CalendarPlus /> Book service
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("log")}>
            <NotebookPen /> Log a call
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(`/customers/view/?id=${customer.id}`)}>
            <ExternalLink /> Open profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("edit")}>
            <Pencil /> Edit details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
            <Trash2 /> Delete customer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
    </div>
  );
}
