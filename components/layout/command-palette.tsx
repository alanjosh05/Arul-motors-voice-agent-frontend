"use client";

// The ⌘K search window, loaded on first open (see command-menu.tsx). It
// fetches the customer list only once it's actually used.
import { CalendarPlus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { CustomerAvatar } from "@/components/customer-avatar";
import { NAV } from "@/components/layout/nav";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { formatMobile } from "@/lib/format";
import { useCustomers } from "@/lib/queries";

export default function CommandPalette({
  open,
  setOpen,
  onNewCustomer,
  onNewBooking,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  onNewCustomer: () => void;
  onNewBooking: () => void;
}) {
  const router = useRouter();
  const { data: customers = [] } = useCustomers();
  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Find a customer or jump to a page">
      {/* This shadcn version doesn't wrap the dialog's children in <Command>. */}
      <Command>
        <CommandInput placeholder="Type a name, mobile, registration or page…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => run(onNewCustomer)}>
              <UserPlus /> Add customer
            </CommandItem>
            <CommandItem onSelect={() => run(onNewBooking)}>
              <CalendarPlus /> Book a service
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Customers">
            {customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name} ${c.mobile_number} ${c.vehicles.map((v) => `${v.registration_number} ${v.model}`).join(" ")}`}
                onSelect={() => run(() => router.push(`/customers/view/?id=${c.id}`))}
              >
                <CustomerAvatar name={c.name} className="size-6" />
                <span className="font-medium">{c.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {formatMobile(c.mobile_number)} · {c.vehicles.map((v) => v.registration_number).join(", ")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Pages">
            {NAV.map((item) => (
              <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
                <item.icon /> {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
