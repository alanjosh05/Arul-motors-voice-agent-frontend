"use client";

import { ComingSoon } from "@/components/coming-soon";

/** Accounts: provisioned, being built. */
export default function IncomePage() {
  return (
    <ComingSoon
      title="Income"
      description="Money coming in: sales, service and spares."
      plans={[
        "Bike sales, service bills (from job cards), spares and accessories",
        "Payment mode: cash, UPI, card, finance",
        "Daily collection and month totals",
        "GST on each bill",
      ]}
    />
  );
}
