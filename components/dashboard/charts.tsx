"use client";

// The dashboard's charts, in their own chunk: recharts (~0.3 MB) loads after
// the numbers, behind skeletons (see dashboard/page.tsx).
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDate, formatDay, OUTCOME_LABELS } from "@/lib/format";
import type { CallOutcome, DashboardStats } from "@/lib/types";

const OUTCOME_COLORS: Record<CallOutcome, string> = {
  date_confirmed: "var(--chart-2)",
  callback_requested: "var(--chart-3)",
  already_serviced: "var(--chart-5)",
  not_interested: "var(--chart-4)",
  no_answer: "color-mix(in oklch, var(--muted-foreground) 55%, transparent)",
  bike_sold: "color-mix(in oklch, var(--muted-foreground) 35%, transparent)",
  wrong_number: "color-mix(in oklch, var(--muted-foreground) 20%, transparent)",
};

const bookingsConfig = { count: { label: "Bookings", color: "var(--chart-1)" } } satisfies ChartConfig;
const callsConfig = {
  total: { label: "Calls", color: "var(--chart-1)" },
  confirmed: { label: "Date confirmed", color: "var(--chart-2)" },
} satisfies ChartConfig;
const outcomesConfig = Object.fromEntries(
  Object.entries(OUTCOME_LABELS).map(([k, label]) => [k, { label, color: OUTCOME_COLORS[k as CallOutcome] }]),
) satisfies ChartConfig;

export function BookingsChart({ data }: { data: DashboardStats["appointments_next_14_days"] }) {
  return (
    <ChartContainer config={bookingsConfig} className="aspect-auto h-[240px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={(v) => formatDate(v, "d MMM")} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent labelFormatter={(v) => formatDay(String(v))} />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 2, 2]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}

export function OutcomesChart({ outcomes, total }: { outcomes: DashboardStats["call_outcomes_30d"]; total: number }) {
  return (
    <ChartContainer config={outcomesConfig} className="mx-auto aspect-auto h-[240px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="outcome" hideLabel />} />
        <Pie data={outcomes} dataKey="count" nameKey="outcome" innerRadius={62} outerRadius={92} strokeWidth={3} paddingAngle={2}>
          {outcomes.map((o) => (
            <Cell key={o.outcome} fill={OUTCOME_COLORS[o.outcome]} stroke="var(--card)" />
          ))}
          <Label
            content={({ viewBox }) =>
              viewBox && "cx" in viewBox ? (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                    {total}
                  </tspan>
                  <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                    calls
                  </tspan>
                </text>
              ) : null
            }
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="outcome" />} className="flex-wrap gap-y-1 text-xs" />
      </PieChart>
    </ChartContainer>
  );
}

export function CallsChart({ data }: { data: DashboardStats["calls_last_14_days"] }) {
  return (
    <ChartContainer config={callsConfig} className="aspect-auto h-[240px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fillConfirmed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-confirmed)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-confirmed)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={(v) => formatDate(v, "d MMM")} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => formatDay(String(v))} indicator="dot" />} />
        <Area dataKey="total" type="monotone" stroke="var(--color-total)" fill="url(#fillTotal)" strokeWidth={2} />
        <Area dataKey="confirmed" type="monotone" stroke="var(--color-confirmed)" fill="url(#fillConfirmed)" strokeWidth={2} />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
