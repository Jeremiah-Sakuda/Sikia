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

function hourIn(timeZone: string, now: Date) {
  const hour = new Intl.DateTimeFormat("en-US", { hour: "2-digit", hourCycle: "h23", timeZone })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  return Number(hour ?? 0);
}

export default function Family() {
  const now = new Date();
  const clocks = seed.profile.familyClocks.map((clock) => ({
    ...clock,
    hour: hourIn(clock.timeZone, now),
    minute: now.getMinutes(),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: clock.timeZone }).format(now),
  }));
  const goodTime = clocks.every(({ hour }) => hour >= 8 && hour < 21);

  return (
    <section style={card}>
      <div style={{ marginBottom: tokens.spacing.md, color: tokens.colors.heading, fontSize: tokens.type.widgetTitle, fontWeight: tokens.type.bold }}>
        Family
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing.clocks }}>
        {clocks.map((clock) => (
          <div key={clock.city} style={{ display: "flex", alignItems: "center", gap: tokens.spacing.md }}>
            <svg aria-hidden="true" height={tokens.sizes.clock} viewBox="0 0 40 40" width={tokens.sizes.clock}>
              <circle cx="20" cy="20" fill="none" r="18" stroke={tokens.colors.divider} strokeWidth={tokens.borders.width} />
              <line
                stroke={tokens.colors.clockHands}
                strokeWidth={tokens.borders.clockHand}
                transform={`rotate(${(clock.hour % 12) * 30 + clock.minute * 0.5} 20 20)`}
                x1="20"
                x2="20"
                y1="20"
                y2="9"
              />
              <line
                stroke={tokens.colors.clockHands}
                strokeWidth={tokens.borders.width}
                transform={`rotate(${clock.minute * 6} 20 20)`}
                x1="20"
                x2="20"
                y1="20"
                y2="7"
              />
            </svg>
            <div style={{ fontSize: tokens.type.clock, lineHeight: tokens.type.compactLineHeight }}>
              <div>{clock.city}</div>
              <div style={{ color: tokens.colors.faint }}>{clock.time}</div>
            </div>
          </div>
        ))}
        <div
          style={{
            color: goodTime ? tokens.colors.good : tokens.colors.unavailable,
            fontSize: tokens.type.indicator,
            lineHeight: tokens.type.compactLineHeight,
          }}
        >
          {goodTime ? "Good time to call" : "Not a good time to call"}
        </div>
      </div>
    </section>
  );
}
