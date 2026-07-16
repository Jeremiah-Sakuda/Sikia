/** @vitest-environment jsdom */
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import App from "../App.js";
import { widgetRegistry } from "../widgets/registry.js";

const userlandRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("userland smoke suite", () => {
  it("renders every registered widget without throwing", () => {
    for (const widget of widgetRegistry) {
      expect(() => document.body.append(widget.render())).not.toThrow();
    }
  });

  it("gives App.tsx a default export", () => {
    expect(typeof App).toBe("function");
  });

  it("keeps userland imports out of kernel and shell", async () => {
    const names = await readdir(userlandRoot, { recursive: true });
    const files = names.filter((name) => /\.(?:ts|tsx)$/.test(name) && !name.startsWith("dist/"));
    for (const file of files) {
      const source = await readFile(resolve(userlandRoot, file), "utf8");
      expect(source, file).not.toMatch(/from\s+["'][^"']*(?:kernel|shell)\//);
    }
  });
});
