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

export default function Notes() {
  return (
    <section style={card}>
      <div style={{ marginBottom: tokens.spacing.sm, color: tokens.colors.heading, fontSize: tokens.type.widgetTitle, fontWeight: tokens.type.bold }}>
        Notes
      </div>
      <ul
        style={{
          margin: tokens.spacing.none,
          paddingLeft: tokens.spacing.listIndent,
          color: tokens.colors.textStrong,
          fontSize: tokens.type.note,
        }}
      >
        {seed.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  );
}
