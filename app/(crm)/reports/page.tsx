"use client";

import { ComingSoon } from "@/components/coming-soon";

/** Accounts: provisioned, being built. */
export default function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      description="Account reports to download and share."
      plans={[
        "Profit & loss, income and expense statements",
        "Salary register",
        "GST summary",
        "Download as Excel or PDF",
      ]}
    />
  );
}
