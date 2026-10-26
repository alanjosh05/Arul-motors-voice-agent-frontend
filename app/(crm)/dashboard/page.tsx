"use client";

import { ArrowRight, CalendarCheck, CircleGauge, PhoneOutgoing, Users } from "lucide-react";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CallButton } from "@/components/actions";
import { useAuth } from "@/components/auth-provider";
import { CustomerAvatar } from "@/components/customer-avatar";
import { useLive } from "@/components/live-provider";
import { ActiveCallRow } from "@/components/live/live-indicators";
import { BikesByModel } from "@/components/dashboard/bikes-by-model";
import { UpcomingAndRecent } from "@/components/dashboard/upcoming-and-recent";
import { StatCard } from "@/components/stat-card";
import { DueBadge, OutcomeBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDay, timeAgo } from "@/lib/format";
import { useStats } from "@/lib/queries";
import { BookingArt } from "@/components/art/booking";
import { CallArt } from "@/components/art/call";
import { AnimateIn } from "@/components/motion/animate-in";

// Charts load in their own chunk after the KPIs render.
const chartLoading = () => <Skeleton className="h-[240px] w-full rounded-lg" />;
const BookingsChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.BookingsChart), { ssr: false, loading: chartLoading });
const OutcomesChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.OutcomesChart), { ssr: false, loading: chartLoading });
const CallsChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.CallsChart), { ssr: false, loading: chartLoading });

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

const NO_POINTS: never[] = []; // stable empty chart data while loading

function ChartSkeleton() {
  return <Skeleton className="h-[240px] w-full rounded-lg" />;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useStats();
  const { activeCalls } = useLive();
  const t = data?.totals;
  const outcomes = useMemo(() => (data?.call_outcomes_30d ?? []).filter((o) => o.count > 0), [data]);
  const totalCalls30 = outcomes.reduce((sum, o) => sum + o.count, 0);

  return (
    <AnimateIn preset="cards" className="contents">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{formatDay(data?.today ?? new Date().toISOString())}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {user?.full_name?.split(" ")[0] || user?.username}
        </h1>
      </div>

      {activeCalls.length > 0 && (
        <Card className="gap-3 border-success/30 bg-success/5 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
              Live calls
            </CardTitle>
            <CardDescription>The voice agent is on these calls right now</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1 px-2 sm:grid-cols-2 xl:grid-cols-3">
            {activeCalls.map((c) => (
              <ActiveCallRow key={c.call_id ?? c.id} call={c} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" icon={Users} loading={isLoading} value={t?.customers ?? 0} hint={`${t?.vehicles ?? 0} bikes on record`} />
        <StatCard
          label="Due this week"
          icon={PhoneOutgoing}
          tone="warning"
          loading={isLoading}
          value={t?.due_this_week ?? 0}
          hint={t?.overdue ? <span className="text-destructive">{t.overdue} overdue · not yet booked</span> : "Not yet booked"}
        />
        <StatCard
          label="Upcoming bookings"
          icon={CalendarCheck}
          tone="primary"
          loading={isLoading}
          value={t?.upcoming_appointments ?? 0}
          hint={`${t?.appointments_today ?? 0} today · ${t?.completed_this_month ?? 0} serviced this month`}
        />
        <StatCard
          label="Confirmation rate"
          icon={CircleGauge}
          tone="success"
          loading={isLoading}
          value={t?.confirmation_rate ?? 0}
          suffix="%"
          hint={`Last 30 days · ${t?.calls_this_week ?? 0} calls this week`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Bookings ahead</CardTitle>
            <CardDescription>Bikes coming in over the next 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <BookingsChart data={data?.appointments_next_14_days ?? NO_POINTS} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Call outcomes</CardTitle>
            <CardDescription>Agent and staff calls, last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : totalCalls30 === 0 ? (
              <Empty className="h-[240px] border-0">
                <EmptyHeader>
                  <EmptyMedia><CallArt className="h-24" /></EmptyMedia>
                  <EmptyTitle>No calls yet</EmptyTitle>
                  <EmptyDescription>Outcomes appear here once the agent starts calling.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <OutcomesChart outcomes={outcomes} total={totalCalls30} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Follow-up calls</CardTitle>
            <CardDescription>Calls per day, last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <CallsChart data={data?.calls_last_14_days ?? NO_POINTS} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Today at the workshop</CardTitle>
            <CardDescription>{formatDay(data?.today ?? new Date().toISOString())}</CardDescription>
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
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : data?.todays_appointments.length ? (
              <ul className="scroll-y max-h-80 divide-y pr-1">
                {data.todays_appointments.map((a) => (
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
                    <span className="plate">{a.registration_number}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="h-[200px] border-0">
                <EmptyHeader>
                  <EmptyMedia><BookingArt className="h-20" /></EmptyMedia>
                  <EmptyTitle>No bikes booked for today</EmptyTitle>
                  <EmptyDescription>Bookings the agent confirms show up here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Due for follow-up</CardTitle>
            <CardDescription>Service due within a week, not yet booked</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/follow-ups/">
                  View all <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : data?.due_services.length ? (
              <ul className="divide-y">
                {data.due_services.map((d) => (
                  <li key={d.vehicle_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <CustomerAvatar name={d.name} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/customers/view/?id=${d.customer_id}`} className="block truncate text-sm font-medium hover:underline">
                        {d.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.model} · {d.next_service_type}
                      </p>
                    </div>
                    <DueBadge date={d.next_service_date} serviceType={d.next_service_type} />
                    <CallButton
                      iconOnly
                      customer={{ id: d.customer_id, name: d.name, mobile_number: d.mobile_number }}
                      subtitle={`${d.model} · ${d.next_service_type} due ${formatDay(d.next_service_date)}`}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="h-[200px] border-0">
                <EmptyHeader>
                  <EmptyTitle>All caught up</EmptyTitle>
                  <EmptyDescription>No unbooked services due this week.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
            <CardDescription>Latest outcomes</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/calls/">
                  Call log <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : data?.recent_calls.length ? (
              <ul className="space-y-3">
                {data.recent_calls.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <CustomerAvatar name={c.customer_name ?? "?"} className="size-7" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
                    </div>
                    <OutcomeBadge outcome={c.outcome} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="h-[200px] border-0">
                <EmptyHeader>
                  <EmptyMedia><CallArt className="h-24" /></EmptyMedia>
                  <EmptyTitle>No calls yet</EmptyTitle>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      <UpcomingAndRecent data={data} isLoading={isLoading} />

      <BikesByModel />
    </AnimateIn>
  );
}

