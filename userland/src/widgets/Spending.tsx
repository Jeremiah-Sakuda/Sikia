import type { CSSProperties } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import seed from "../data/seed.json" with { type: "json" };
import { tokens } from "../tokens.js";

const card: CSSProperties = {
  height: "100%",
  boxSizing: "border-box",
  padding: `${tokens.spacing.cardY}px ${tokens.spacing.cardX}px`,
  border: `${tokens.borders.width}px solid ${tokens.colors.border}`,
  borderRadius: tokens.radii.card,
  background: tokens.colors.surface,
};

const chartData: Array<Record<string, string | number>> = seed.spending.months.map((month, index) => {
  const row: Record<string, string | number> = { month };
  for (const category of seed.spending.categories) row[category.name] = category.values[index] ?? 0;
  return row;
});

export default function Spending() {
  return (
    <section style={card}>
      <div
        style={{
          marginBottom: tokens.spacing.xs,
          color: tokens.colors.heading,
          fontSize: tokens.type.widgetTitle,
          fontWeight: tokens.type.bold,
        }}
      >
        Spending by category
      </div>
      <div style={{ width: "100%", height: tokens.sizes.chartHeight }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: tokens.spacing.xs, right: tokens.spacing.xs, bottom: tokens.spacing.none, left: tokens.spacing.none }}>
            <CartesianGrid stroke={tokens.colors.chartGrid} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: tokens.colors.faint, fontSize: tokens.type.axis }} tickLine={false} />
            <YAxis tick={{ fill: tokens.colors.faint, fontSize: tokens.type.axis }} tickLine={false} axisLine={false} />
            <Legend
              iconSize={tokens.sizes.legendLine}
              wrapperStyle={{ color: tokens.colors.muted, fontSize: tokens.type.legend }}
            />
            {seed.spending.categories.map((category, index) => (
              <Line
                dataKey={category.name}
                dot={false}
                key={category.name}
                stroke={tokens.colors.chartPalette[index % tokens.colors.chartPalette.length] ?? tokens.colors.unavailable}
                strokeWidth={tokens.borders.width}
                type="linear"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
