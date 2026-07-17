import { describe, expect, it } from "vitest";
import { CODEX_TIMEOUT_MS, TOTAL_REQUEST_TIMEOUT_MS } from "./config.js";

describe("request budgets", () => {
  it("keeps the per-invocation and total request limits fixed", () => {
    expect(CODEX_TIMEOUT_MS).toBe(180_000);
    expect(TOTAL_REQUEST_TIMEOUT_MS).toBe(240_000);
  });
});
