import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT_DIR } from "./config.js";

const kernelFiles = ["server.ts", "codex.ts", "gauntlet.ts", "git.ts", "fence.ts", "config.ts"];

describe("zone boundaries", () => {
  it("keeps kernel imports out of userland", async () => {
    const sources = await Promise.all(kernelFiles.map((file) => readFile(resolve(ROOT_DIR, "kernel", file), "utf8")));
    expect(sources.join("\n")).not.toMatch(/from\s+["'][^"']*userland/);
  });

  it("keeps userland imports out of kernel and shell", async () => {
    const app = await readFile(resolve(ROOT_DIR, "userland/src/App.tsx"), "utf8");
    const tokens = await readFile(resolve(ROOT_DIR, "userland/src/tokens.ts"), "utf8");
    expect(`${app}\n${tokens}`).not.toMatch(/from\s+["'][^"']*(kernel|shell)/);
  });

  it("allows only the gauntlet to call the commit helper", async () => {
    const server = await readFile(resolve(ROOT_DIR, "kernel/server.ts"), "utf8");
    const gauntlet = await readFile(resolve(ROOT_DIR, "kernel/gauntlet.ts"), "utf8");
    expect(server).not.toMatch(/\bcommit\s*\(/);
    expect(gauntlet).toMatch(/await commit\(userText\)/);
  });
});
