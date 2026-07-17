import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

const root = document.querySelector("#root");
if (root === null) throw new Error("Sikia could not find its root element.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
