import { describe, expect, it } from "vitest";
import { checkFence } from "./fence.js";

describe("checkFence", () => {
  it("allows only files beneath userland/src", () => {
    expect(checkFence(["userland/src/App.tsx", "userland/src/widgets/Day.tsx"])).toEqual({ ok: true, violations: [] });
  });

  it("rejects runtime instructions and kernel changes", () => {
    const files = ["userland/AGENTS.md", "kernel/server.ts"];
    expect(checkFence(files)).toEqual({ ok: false, violations: files });
  });

  it("rejects traversal out of the mutable zone", () => {
    expect(checkFence(["userland/src/../AGENTS.md"]).ok).toBe(false);
  });
});
