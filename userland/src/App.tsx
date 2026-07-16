import { tokens } from "./tokens.js";

export default function App(): string {
  return "Hello from Sikia userland";
}

const root = document.querySelector<HTMLElement>("#root");
if (root !== null) {
  root.textContent = App();
  root.style.background = tokens.background;
  root.style.fontSize = `${tokens.textSize}px`;
}
