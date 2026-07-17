import type { CSSProperties } from "react";
import layout from "./layout.json" with { type: "json" };
import { tokens } from "./tokens.js";
import { widgetRegistry } from "./widgets/registry.js";

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  boxSizing: "border-box",
  padding: tokens.spacing.page,
  background: tokens.colors.background,
  color: tokens.colors.text,
  fontFamily: tokens.type.fontFamily,
  fontSize: tokens.type.base,
  lineHeight: tokens.type.lineHeight,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: tokens.layout.columns,
  gap: tokens.spacing.grid,
};

export default function App() {
  return (
    <main style={pageStyle}>
      <div style={gridStyle}>
        {layout
          .filter(({ visible }) => visible)
          .sort((left, right) => left.position - right.position)
          .map(({ widget }) => {
            const Widget = widgetRegistry[widget as keyof typeof widgetRegistry];
            if (Widget === undefined) return null;
            return (
              <div
                data-widget={widget}
                key={widget}
                style={{ gridColumn: widget === "Cashflow" ? tokens.layout.fullWidth : undefined }}
              >
                <Widget />
              </div>
            );
          })}
      </div>
    </main>
  );
}
