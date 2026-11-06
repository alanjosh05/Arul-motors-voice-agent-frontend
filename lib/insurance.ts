import { daysFromToday } from "@/lib/format";

/** Reminders start this many days before a policy expires. */
export const INSURANCE_REMIND_DAYS = 30;

export type InsuranceStatus = "none" | "expired" | "soon" | "valid";

export function insuranceStatus(expiry?: string | null): InsuranceStatus {
  if (!expiry) return "none";
  const n = daysFromToday(expiry);
  return n < 0 ? "expired" : n <= INSURANCE_REMIND_DAYS ? "soon" : "valid";
}

/** Bikes whose policy has expired or expires soon (the reminder list). */
export const needsInsuranceReminder = (expiry?: string | null) => {
  const s = insuranceStatus(expiry);
  return s === "expired" || s === "soon";
};
