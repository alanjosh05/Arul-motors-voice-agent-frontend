"use client";

import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { FormDraft } from "@/lib/drafts";
import { cn } from "@/lib/utils";

/** Shared dialog chrome for every CRM form. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  pending,
  onSubmit,
  children,
  wide,
  xl,
  draft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
  wide?: boolean;
  /** Extra wide, for long forms (e.g. closing a service with its job card). */
  xl?: boolean;
  /** The form's saved draft: shows "restored" with a way to discard it, and
   * Cancel discards it. (Each form clears it itself after a successful save.) */
  draft?: FormDraft;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Long forms scroll inside the dialog instead of running off the screen. */}
      <DialogContent className={cn("max-h-[92svh] overflow-y-auto", xl ? "sm:max-w-4xl" : wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="grid gap-5"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {draft?.restored && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <History className="size-4 shrink-0 text-primary" />
              <span className="flex-1">Restored what you typed last time.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  draft.clear();
                  onOpenChange(false); // reopen to start fresh
                }}
              >
                Discard draft
              </Button>
            </div>
          )}
          {children}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Cancel means "throw this away"; ×, Escape and clicking outside
                // keep the draft (those are the accidental closes).
                draft?.clear();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
