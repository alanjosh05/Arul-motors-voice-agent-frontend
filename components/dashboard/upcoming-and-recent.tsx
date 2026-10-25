"use client";

import { ArrowRight, CalendarClock, Wrench } from "lucide-react";
import Link from "next/link";
import { CustomerAvatar } from "@/components/customer-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDay, formatKm } from "@/lib/format";
import { rupees } from "@/lib/job-card";
import type { DashboardStats } from "@/lib/types";

function Loading() {
  return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
}

function Nothing({ icon: Icon, title, text }: { icon: typeof Wrench; title: string; text: string }) {
  return (
    <Empty className="h-[200px] border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Dashboard: the next booked services, and the latest services done. */
export function UpcomingAndRecent({ data, isLoading }: { data?: DashboardStats; isLoading: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming appointments</CardTitle>
          <CardDescription>Bikes booked after today{data ? ` · ${data.totals.upcoming_appointments} in all` : ""}</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/appointments/">
                All <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loading />
          ) : data?.upcoming_list?.length ? (
            <ul className="scroll-y max-h-96 divide-y pr-1">
              {data.upcoming_list.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <CustomerAvatar name={a.customer_name ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/customers/view/?id=${a.customer_id}`} className="block truncate text-sm font-medium hover:underline">
                      {a.customer_name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.model} · {a.service_type}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <p className="tabular text-sm font-medium">{formatDay(a.appointment_date)}</p>
                    <span className="plate">{a.registration_number}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Nothing icon={CalendarClock} title="No upcoming bookings" text="Bookings made by staff or the agent show up here." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent services done</CardTitle>
          <CardDescription>Latest closed services{data ? ` · ${data.totals.completed_this_month} this month` : ""}</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/appointments/">
                All <ArrowRight />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loading />
          ) : data?.recent_services?.length ? (
            <ul className="scroll-y max-h-96 divide-y pr-1">
              {data.recent_services.map((r) => (
                <li key={r.kind === "record" ? `r${r.id}` : `b${r.appointment_id}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <CustomerAvatar name={r.customer_name} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/customers/view/?id=${r.customer_id}`} className="block truncate text-sm font-medium hover:underline">
                      {r.customer_name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        r.model,
                        r.service_type,
                        r.kind === "record" && r.job_card_no ? `Job card ${r.job_card_no}` : null,
                        r.odometer_km != null ? formatKm(r.odometer_km) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <p className="tabular text-sm font-medium">{formatDay(r.service_date)}</p>
                    <p className="tabular text-xs text-muted-foreground">
                      {r.kind === "record" ? (r.amount ? rupees(r.amount) : "No charge") : "No job card"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Nothing icon={Wrench} title="No services done yet" text="Close a booking with its job card to record a service." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
