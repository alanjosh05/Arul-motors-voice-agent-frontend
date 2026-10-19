"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

// The search window (cmdk + the customer list) loads on first use.
const CommandPalette = dynamic(() => import("@/components/layout/command-palette"), { ssr: false });

export function CommandMenu({ onNewCustomer, onNewBooking }: { onNewCustomer: () => void; onNewBooking: () => void }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea"))) {
        e.preventDefault();
        setUsed(true);
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="h-8 w-9 justify-start gap-2 px-2 text-muted-foreground sm:w-64 sm:px-2.5"
        onPointerEnter={() => void import("@/components/layout/command-palette")}
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
      >
        <Search />
        <span className="hidden flex-1 text-left font-normal sm:inline">Search customers, bikes…</span>
        <KbdGroup className="hidden sm:inline-flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      {used && <CommandPalette open={open} setOpen={setOpen} onNewCustomer={onNewCustomer} onNewBooking={onNewBooking} />}
    </>
  );
}
