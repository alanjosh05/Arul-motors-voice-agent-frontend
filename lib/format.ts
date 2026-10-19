import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from "date-fns";
import type { AppointmentState, CallOutcome } from "./types";

/** "2026-10-24" → a Date at local midnight (no timezone shift). */
export function day(value: string): Date {
  return parseISO(value.slice(0, 10));
}

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDate(value?: string | null, pattern = "d MMM yyyy"): string {
  return value ? format(day(value), pattern) : "—";
}

export function formatDay(value?: string | null): string {
  return value ? format(day(value), "EEE, d MMM") : "—";
}

/** Server timestamps are UTC "YYYY-MM-DD HH:MM:SS". */
export function parseTimestamp(value: string): Date {
  return new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
}

export function formatTimestamp(value?: string | null): string {
  return value ? format(parseTimestamp(value), "d MMM, h:mm a") : "—";
}

export function timeAgo(value?: string | null): string {
  return value ? formatDistanceToNowStrict(parseTimestamp(value), { addSuffix: true }) : "—";
}

/** Days from today to a date (negative = in the past). */
export function daysFromToday(value: string): number {
  return differenceInCalendarDays(day(value), new Date());
}

export function relativeDay(value: string): string {
  const n = daysFromToday(value);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export function formatMobile(value?: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return value;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatKm(value?: number | null): string {
  return value == null ? "—" : `${value.toLocaleString("en-IN")} km`;
}

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  date_confirmed: "Date confirmed",
  callback_requested: "Call back",
  not_interested: "Not interested",
  already_serviced: "Already serviced",
  bike_sold: "Bike sold",
  wrong_number: "Wrong number",
  no_answer: "No answer",
};

export const STATE_LABELS: Record<AppointmentState, string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  missed: "Missed",
};

export const SERVICE_TYPES = ["First free service", "Second free service", "Third free service", "Paid service"];
