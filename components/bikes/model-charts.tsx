"use client";

// The Bikes page's charts, in their own chunk (recharts loads after the numbers).
import { Bar, BarChart, CartesianGrid, Cell, Label, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { BikeModel } from "@/lib/types";

const customersConfig = {
  customers: { label: "Customers", color: "var(--chart-1)" },
  bikes: { label: "Bikes", color: "var(--chart-2)" },
} satisfies ChartConfig;

const sourceConfig = {
  here: { label: "Sold here", color: "var(--chart-1)" },
  elsewhere: { label: "Another dealer", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Customers per model, most first (top `limit`). */
export function CustomersByModelChart({ models, limit = 10 }: { models: BikeModel[]; limit?: number }) {
  const data = models.filter((m) => m.bikes > 0).slice(0, limit).map((m) => ({ name: m.name, customers: m.customers, bikes: m.bikes }));
  return (
    <ChartContainer config={customersConfig} className="aspect-auto w-full" style={{ height: Math.max(180, data.length * 38 + 30) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={150} tick={{ fontSize: 12 }} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
        <Bar dataKey="customers" fill="var(--color-customers)" radius={[2, 6, 6, 2]} maxBarSize={22}>
          <LabelList dataKey="customers" position="right" className="fill-foreground text-xs font-medium" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Bikes sold here vs bought from another dealer. */
export function SourceChart({ models }: { models: BikeModel[] }) {
  const elsewhere = models.reduce((sum, m) => sum + m.bought_elsewhere, 0);
  const total = models.reduce((sum, m) => sum + m.bikes, 0);
  const data = [
    { source: "here", count: total - elsewhere },
    { source: "elsewhere", count: elsewhere },
  ];
  return (
    <ChartContainer config={sourceConfig} className="mx-auto aspect-auto h-[240px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="source" hideLabel />} />
        <Pie data={data} dataKey="count" nameKey="source" innerRadius={60} outerRadius={90} strokeWidth={3} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.source} fill={`var(--color-${d.source})`} stroke="var(--card)" />
          ))}
          <Label
            content={({ viewBox }) =>
              viewBox && "cx" in viewBox ? (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                    {total}
                  </tspan>
                  <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                    bikes
                  </tspan>
                </text>
              ) : null
            }
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="source" />} className="flex-wrap gap-y-1 text-xs" />
      </PieChart>
    </ChartContainer>
  );
}
