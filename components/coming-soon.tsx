"use client";

import { CircleDashed, Lock } from "lucide-react";
import { UnderConstructionArt } from "@/components/art/under-construction";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** An accounts page that is provisioned but not built yet: the "under
 * construction" illustration and a Coming soon note. Admins only. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock />
          </EmptyMedia>
          <EmptyTitle>Admins only</EmptyTitle>
          <EmptyDescription>Accounts are visible to admins.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="grid items-center gap-8 py-6 lg:grid-cols-[1.1fr_1fr]">
          <UnderConstructionArt className="mx-auto h-64 sm:h-80" />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <CircleDashed className="size-3.5" /> Coming soon
              </span>
              <h2 className="text-xl font-semibold tracking-tight">We&rsquo;re building this page</h2>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
