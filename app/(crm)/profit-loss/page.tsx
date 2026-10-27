"use client";

import { ComingSoon } from "@/components/coming-soon";

/** Accounts: provisioned, being built. */
export default function ProfitLossPage() {
  return (
    <ComingSoon
      title="Profit & loss"
      description="The showroom’s income, costs and profit, month by month."
      plans={[
        "Monthly and yearly profit & loss: income minus expenses and salaries",
        "Income split by bike sales, service, spares and accessories",
        "Compare months and see trends",
        "Export to Excel for the auditor",
      ]}
    />
  );
}
