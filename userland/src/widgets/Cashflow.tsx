import type { CSSProperties } from "react";
import seed from "../data/seed.json" with { type: "json" };
import { tokens } from "../tokens.js";

const style: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: tokens.spacing.md,
  padding: `${tokens.spacing.md}px ${tokens.spacing.cardX}px`,
  border: `${tokens.borders.width}px solid ${tokens.colors.border}`,
  borderRadius: tokens.radii.card,
  background: tokens.colors.surface,
  color: tokens.colors.textStrong,
  fontSize: tokens.type.cashflow,
};

function nextPayday(today: Date, daysOfMonth: readonly number[]) {
  const candidates = daysOfMonth
    .flatMap((day) => [
      new Date(today.getFullYear(), today.getMonth(), day),
      new Date(today.getFullYear(), today.getMonth() + 1, day),
    ])
    .filter((date) => date.getTime() > today.getTime())
    .sort((left, right) => left.getTime() - right.getTime());
  const payday = candidates[0];
  if (payday === undefined) throw new Error("The pay schedule needs at least one day.");
  return payday;
}

export default function Cashflow() {
  const today = new Date();
  const payday = nextPayday(today, seed.profile.paySchedule.daysOfMonth);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const paydayUtc = Date.UTC(payday.getFullYear(), payday.getMonth(), payday.getDate());
  const daysUntil = Math.ceil((paydayUtc - todayUtc) / (24 * 60 * 60 * 1000));
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: seed.profile.currency,
  }).format(seed.profile.balance);

  return (
    <section aria-label="Cashflow" style={style}>
      <span>{today.toLocaleDateString("en-US", { dateStyle: "full" })}</span>
      <span style={{ color: tokens.colors.divider }}>|</span>
      <span>Balance: {money}</span>
      <span style={{ color: tokens.colors.divider }}>|</span>
      <span>
        Next payday: {payday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — in {daysUntil} days
      </span>
    </section>
  );
}
