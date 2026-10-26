"use client";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** Where the bike was bought: here, or another dealer (most bikes serviced
 * here). For another dealer the purchase date is often unknown, and the bike
 * can come in for any service (its 3rd free service, say). */
export function BoughtFromField({
  elsewhere,
  onElsewhereChange,
  dealer,
  onDealerChange,
  idPrefix,
}: {
  elsewhere: boolean;
  onElsewhereChange: (elsewhere: boolean) => void;
  dealer: string;
  onDealerChange: (dealer: string) => void;
  idPrefix: string;
}) {
  return (
    <>
      <Field>
        <FieldLabel>Bought from</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="w-full"
          value={elsewhere ? "elsewhere" : "here"}
          onValueChange={(v) => v && onElsewhereChange(v === "elsewhere")}
        >
          <ToggleGroupItem value="here" className="flex-1">
            Arul Motors
          </ToggleGroupItem>
          <ToggleGroupItem value="elsewhere" className="flex-1">
            Another dealer
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>
      {elsewhere ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-dealer`}>Dealer</FieldLabel>
          <Input
            id={`${idPrefix}-dealer`}
            value={dealer}
            onChange={(e) => onDealerChange(e.target.value)}
            placeholder="Optional, e.g. Sri Murugan Yamaha"
          />
          <FieldDescription>Serviced here; the purchase date can stay “Not known”.</FieldDescription>
        </Field>
      ) : (
        <div className="hidden sm:block" />
      )}
    </>
  );
}
