"use client";

import { ArrowRight, Motorbike } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type ChartRange, RangeFilter, rangeDates, rangeLabel } from "@/components/range-filter";
import { useChartBikeModels } from "@/lib/queries";

const SHOWN = 8; // models listed before "Show all"

/** Dashboard: how many bikes are on record, and how many of each model. */
export function BikesByModel() {
  // Bikes added to the CRM in the period (all time by default).
  const [range, setRange] = useState<ChartRange>({ preset: "all" });
  const { data, isLoading } = useChartBikeModels(rangeDates(range, "past"));
  const models = (data ?? []).map((m) => ({ model: m.name, count: m.bikes })).sort((a, b) => b.count - a.count || a.model.localeCompare(b.model));
  const [all, setAll] = useState(false);
  const total = models.reduce((sum, m) => sum + m.count, 0);
  const top = models[0]?.count ?? 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bikes by model</CardTitle>
        <CardDescription>
          {isLoading
            ? "Loading…"
            : `${total} bike${total === 1 ? "" : "s"} · ${models.length} model${models.length === 1 ? "" : "s"}${range.preset === "all" ? " on record" : ` added ${rangeLabel(range, "past")}`}`}
        </CardDescription>
        <RangeFilter value={range} onChange={setRange} allowAll className="pt-2" />
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/bikes/">
              All bikes <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
        ) : models.length === 0 ? (
          <Empty className="h-[160px] border-0">
            <EmptyHeader>
              <EmptyTitle>{range.preset === "all" ? "No bikes yet" : "No bikes added in this period"}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className={cn("grid gap-x-8 gap-y-3 md:grid-cols-2", all && "scroll-y max-h-96 pr-1")}>
              {(all ? models : models.slice(0, SHOWN)).map((m) => (
                <li key={m.model} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <Motorbike className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{m.model}</span>
                    </span>
                    <span className="tabular shrink-0">
                      <span className="font-semibold">{m.count}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{Math.round((m.count / total) * 100)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (m.count / top) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            {models.length > SHOWN && (
              <Button variant="ghost" size="sm" className="mt-3 h-7 px-2" onClick={() => setAll((v) => !v)}>
                {all ? "Show less" : `Show all ${models.length} models`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
