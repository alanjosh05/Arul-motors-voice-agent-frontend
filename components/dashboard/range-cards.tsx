"use client";

// Dashboard charts, each with its own period (1 week · 15 days · 30 days · custom).
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CallArt } from "@/components/art/call";
import { type ChartRange, RangeFilter, rangeDates, rangeLabel } from "@/components/range-filter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartBookings, useChartCalls } from "@/lib/queries";
import { cn } from "@/lib/utils";

const chartLoading = () => <Skeleton className="h-[240px] w-full rounded-lg" />;

/** Shown when a chart's data couldn't be loaded (instead of an endless placeholder). */
function ChartError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid h-[240px] place-items-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
      <div className="space-y-2">
        <p>Couldn&rsquo;t load this chart.</p>
        <button type="button" onClick={onRetry} className="font-medium text-primary hover:underline">
          Try again
        </button>
      </div>
    </div>
  );
}
const BookingsChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.BookingsChart), { ssr: false, loading: chartLoading });
const OutcomesChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.OutcomesChart), { ssr: false, loading: chartLoading });
const CallsChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.CallsChart), { ssr: false, loading: chartLoading });

/** Card header with the period picker under the title (wraps on small screens). */
function RangeHeader({ title, description, range, onRange }: { title: string; description: string; range: ChartRange; onRange: (r: ChartRange) => void }) {
  return (
    <CardHeader className="gap-3">
      <div className="space-y-1">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <RangeFilter value={range} onChange={onRange} />
    </CardHeader>
  );
}

export function BookingsCard({ className }: { className?: string }) {
  const [range, setRange] = useState<ChartRange>({ preset: 15 });
  const span = rangeDates(range, "future");
  const { data, isLoading, isError, refetch } = useChartBookings(span);
  const total = data?.reduce((sum, d) => sum + d.count, 0) ?? 0;
  return (
    <Card className={className}>
      <RangeHeader title="Bookings" description={`${total} bike${total === 1 ? "" : "s"} booked for ${rangeLabel(range, "future")}`} range={range} onRange={setRange} />
      <CardContent>{isError && !data ? <ChartError onRetry={() => refetch()} /> : isLoading || !data ? chartLoading() : <BookingsChart data={data} />}</CardContent>
    </Card>
  );
}

export function OutcomesCard({ className }: { className?: string }) {
  const [range, setRange] = useState<ChartRange>({ preset: 30 });
  const { data, isLoading, isError, refetch } = useChartCalls(rangeDates(range, "past"));
  const outcomes = useMemo(() => (data?.outcomes ?? []).filter((o) => o.count > 0), [data]);
  return (
    <Card className={className}>
      <RangeHeader title="Call outcomes" description={`Agent and staff calls, ${rangeLabel(range, "past")}`} range={range} onRange={setRange} />
      <CardContent>
        {isError && !data ? (
          <ChartError onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          chartLoading()
        ) : data.total === 0 ? (
          <Empty className="h-[240px] border-0">
            <EmptyHeader>
              <EmptyMedia>
                <CallArt className="h-24" />
              </EmptyMedia>
              <EmptyTitle>No calls in this period</EmptyTitle>
              <EmptyDescription>Pick a longer period, or outcomes appear once the agent calls.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <OutcomesChart outcomes={outcomes} total={data.total} />
        )}
      </CardContent>
    </Card>
  );
}

export function CallsCard({ className }: { className?: string }) {
  const [range, setRange] = useState<ChartRange>({ preset: 15 });
  const { data, isLoading, isError, refetch } = useChartCalls(rangeDates(range, "past"));
  return (
    <Card className={cn(className)}>
      <RangeHeader title="Follow-up calls" description={`Calls per day, ${rangeLabel(range, "past")}`} range={range} onRange={setRange} />
      <CardContent>{isError && !data ? <ChartError onRetry={() => refetch()} /> : isLoading || !data ? chartLoading() : <CallsChart data={data.per_day} />}</CardContent>
    </Card>
  );
}
