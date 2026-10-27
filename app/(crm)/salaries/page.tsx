"use client";

import { ComingSoon } from "@/components/coming-soon";

/** Accounts: provisioned, being built. */
export default function SalariesPage() {
  return (
    <ComingSoon
      title="Salaries"
      description="Monthly salary records for Our staff."
      plans={[
        "Salary per staff member, linked to Our staff",
        "Monthly payslip: basic, incentives, advances and deductions",
        "Paid / pending status with payment date",
        "Year-to-date totals per person",
      ]}
    />
  );
}
