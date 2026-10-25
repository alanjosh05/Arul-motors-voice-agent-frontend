// The fields of Arul Motors' Yamaha job card, used when closing a service.
// Keep JOB_TYPES and FEEDBACK_RATINGS in step with database.py.
import type { JobCardFeedback } from "./types";

export const JOB_TYPES = ["Free service", "Paid service", "Accidental", "Quick repair", "Warranty repair"];

/** Supervisor observation / jobs done on the card. */
export const JOBS_DONE = [
  "Engine oil change",
  "Water wash",
  "General check-up",
  "Transmission oil change",
  "Chain lube",
  "Injector cleaning",
  "Carbon cleaning",
  "Consumables",
];

/** Standard check at the time of delivery. */
export const DELIVERY_CHECKS = [
  "All jobs done as per periodic maintenance check sheet",
  "Customer demanded jobs done",
  "Final inspection done",
  "Tool kit & first aid kit",
  "Fuel level same as at receiving",
  "Returned without physical damage",
  "Replaced parts handed over",
];

export const FEEDBACK_RATINGS = ["Excellent", "Very good", "Good", "Average", "Below expectation"];

/** Yes/No (OK/Not OK) feedback checks on the card. */
export const FEEDBACK_CHECKS: { key: Exclude<keyof JobCardFeedback, "rating">; label: string; yes: string; no: string }[] = [
  { key: "delivery_on_time", label: "Delivery on time", yes: "Yes", no: "No" },
  { key: "washing_quality", label: "Washing quality", yes: "OK", no: "Not OK" },
  { key: "staff_behaviour", label: "Staff behaviour", yes: "OK", no: "Not OK" },
  { key: "fairness_of_charges", label: "Fairness of charges", yes: "OK", no: "Not OK" },
  { key: "repairing_quality", label: "Repairing quality", yes: "OK", no: "Not OK" },
];

export const rupees = (n: number | null | undefined) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
