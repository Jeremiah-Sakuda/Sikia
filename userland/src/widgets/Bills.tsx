import type { CSSProperties } from "react";
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
const heading: CSSProperties = {
  marginBottom: tokens.spacing.sm,
  color: tokens.colors.heading,
  fontSize: tokens.type.widgetTitle,
  fontWeight: tokens.type.bold,
};
const cell: CSSProperties = {
  padding: `${tokens.spacing.xs}px ${tokens.spacing.xxs}px`,
  borderBottom: `${tokens.borders.width}px solid ${tokens.colors.rowRule}`,
};

export default function Bills() {
  const bills = [...seed.bills].sort((left, right) => left.dateAdded.localeCompare(right.dateAdded));
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: seed.profile.currency });

  return (
    <section style={card}>
      <div style={heading}>Bills</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: tokens.type.table }}>
        <thead>
          <tr>
            {(["Name", "Due", "Amount"] as const).map((label) => (
              <th
                key={label}
                style={{
                  ...cell,
                  borderBottomColor: tokens.colors.rule,
                  color: tokens.colors.muted,
                  fontWeight: tokens.type.bold,
                  textAlign: label === "Amount" ? "right" : "left",
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <tr key={bill.label}>
              <td style={cell}>{bill.label}</td>
              <td style={cell}>{new Date(`${bill.due}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
              <td style={{ ...cell, textAlign: "right" }}>{money.format(bill.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
