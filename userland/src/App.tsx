import { tokens } from "./tokens.js";
import { widgetRegistry } from "./widgets/registry.js";

export default function App() {
  const main = document.createElement("main");
  main.style.background = tokens.background;
  main.style.fontSize = `${tokens.textSize}px`;
  for (const widget of widgetRegistry) main.append(widget.render());
  return main;
}

const root = document.querySelector("#root");
if (root !== null) root.replaceChildren(App());
