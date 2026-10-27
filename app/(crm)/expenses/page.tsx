"use client";

import { ComingSoon } from "@/components/coming-soon";

/** Accounts: provisioned, being built. */
export default function ExpensesPage() {
  return (
    <ComingSoon
      title="Expenses"
      description="What the showroom spends, by category."
      plans={[
        "Rent, electricity, fuel, purchases, maintenance and more",
        "Bills and receipts attached to each expense",
        "Categories the admin can manage",
        "Month totals by category",
      ]}
    />
  );
}
