import { addDays } from "date-fns";
import { toISO } from "@/lib/format";
import { nextScheduledType } from "@/lib/queries";
import type { ServiceType } from "@/lib/types";

const DEFAULT_INTERVAL_DAYS = 90;

/** Services a bike can have done or due: active, scheduled, not repairs. */
export const scheduledTypes = (types: ServiceType[] | undefined) =>
  (types ?? []).filter((t) => t.active && t.interval_days && !t.is_repair);

/** The next service worked out from the last one: the customer's next ticked
 *  service after `lastType` (their first when there is none), due that
 *  service's interval after the last service (or the purchase, or today). */
export function planNext({
  types,
  allowed,
  lastType,
  lastDate,
  purchase,
}: {
  types: ServiceType[] | undefined;
  allowed?: string[];
  lastType?: string;
  lastDate?: string | null;
  purchase?: string | null;
}) {
  const mine = allowed?.length ? scheduledTypes(types).filter((t) => allowed.includes(t.name)) : scheduledTypes(types);
  const type = lastType ? nextScheduledType(types, lastType, allowed)?.name : mine[0]?.name;
  const base = lastDate ?? purchase ?? toISO(new Date());
  /** When `name` falls due, counted from the last service. */
  const dueFor = (name: string | undefined) =>
    toISO(addDays(new Date(`${base}T00:00:00`), types?.find((t) => t.name === name)?.interval_days ?? DEFAULT_INTERVAL_DAYS));
  return { type, dueFor };
}
