import { describe, expect, it } from "vitest";
import { assertResetSafe, staleTagMessage } from "./demo-reset.js";

describe("demo reset safety", () => {
  it("refuses a dirty tree outside userland", () => {
    expect(() => assertResetSafe([" M README.md"], true, [])).toThrow(
      "Demo reset stopped: preserve these non-userland changes first:\n M README.md",
    );
  });

  it("refuses a stale tag that would erase engineering work", () => {
    expect(() => assertResetSafe([], true, ["userland/src/tokens.ts", "kernel/codex.ts"])).toThrow(staleTagMessage);
  });

  it("refuses a tag that is not an ancestor of HEAD", () => {
    expect(() => assertResetSafe([], false, [])).toThrow(staleTagMessage);
  });

  it("allows only userland mutation commits after the tag", () => {
    expect(() => assertResetSafe([], true, ["userland/src/tokens.ts", "userland/src/widgets/Bills.tsx"])).not.toThrow();
  });
});
