import { describe, expect, it } from "vitest";
import { changedPathsSince } from "./git.js";

describe("request baseline", () => {
  it("ignores a pre-existing untracked file and reports only request changes", () => {
    const baseline = ["?? reference/notes.txt"];
    const current = ["?? reference/notes.txt", " M userland/src/widgets/Bills.tsx"];
    expect(changedPathsSince(baseline, current)).toEqual(["userland/src/widgets/Bills.tsx"]);
  });

  it("handles quoted paths and new untracked files", () => {
    expect(changedPathsSince([], ['?? "userland/src/a file.ts"'])).toEqual(["userland/src/a file.ts"]);
  });
});
