import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  instructions: [] as string[],
  scripts: [] as string[],
  fenceOk: true,
  failuresRemaining: 0,
  commit: vi.fn(),
  diffNames: vi.fn(),
  resetHard: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("./codex.js", () => ({
  runCodex(instruction: string) {
    mocks.instructions.push(instruction);
    return (async function* events() {
      yield { type: "turn.completed", summary: "complete", raw: {} };
    })();
  },
}));

vi.mock("./fence.js", () => ({
  checkFence: () => mocks.fenceOk ? { ok: true, violations: [] } : { ok: false, violations: ["kernel/server.ts"] },
}));

vi.mock("./git.js", () => ({
  commit: mocks.commit,
  diffNames: mocks.diffNames,
  resetHard: mocks.resetHard,
}));

vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile, writeFile: mocks.writeFile }));

vi.mock("node:child_process", () => ({
  execFile(_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout: string, stderr: string) => void) {
    const script = args[1] ?? "";
    mocks.scripts.push(script);
    const fails = script === "typecheck:userland" && mocks.failuresRemaining > 0;
    if (fails) mocks.failuresRemaining -= 1;
    callback(fails ? new Error("typecheck failed") : null, "", fails ? "broken type" : "");
  },
}));

import { runGauntlet } from "./gauntlet.js";

describe("runGauntlet", () => {
  beforeEach(() => {
    mocks.instructions.length = 0;
    mocks.scripts.length = 0;
    mocks.fenceOk = true;
    mocks.failuresRemaining = 0;
    mocks.commit.mockReset().mockResolvedValue(undefined);
    mocks.diffNames.mockReset().mockResolvedValue(["userland/src/App.tsx"]);
    mocks.resetHard.mockReset().mockResolvedValue(undefined);
    mocks.readFile.mockReset().mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
    mocks.writeFile.mockReset().mockResolvedValue(undefined);
  });

  it("refuses a fence violation without checks or retries", async () => {
    mocks.fenceOk = false;
    const result = await runGauntlet("Change the kernel");
    expect(result.outcome).toBe("refused");
    expect(result.retries).toBe(0);
    expect(mocks.scripts).toEqual([]);
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.resetHard).toHaveBeenCalledOnce();
  });

  it("runs checks in order and commits the user's exact words before done", async () => {
    const request = "Badilisha ukubwa uwe 18.";
    const result = await runGauntlet(request);
    expect(mocks.scripts).toEqual(["typecheck:userland", "lint:userland", "test:userland"]);
    expect(mocks.commit).toHaveBeenCalledWith(request);
    expect(result.outcome).toBe("done");
    expect(mocks.resetHard).not.toHaveBeenCalled();
  });

  it("feeds errors back and reruns the full gauntlet", async () => {
    mocks.failuresRemaining = 1;
    const result = await runGauntlet("Fix the greeting");
    expect(mocks.instructions[1]).toContain("Your change failed validation with these errors:\nbroken type");
    expect(mocks.instructions[1]).toContain("Fix them without expanding the scope of the change");
    expect(mocks.scripts).toEqual(["typecheck:userland", "typecheck:userland", "lint:userland", "test:userland"]);
    expect(mocks.diffNames).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ outcome: "done", retries: 1 });
  });

  it("resets, logs, and reverts after two retries", async () => {
    mocks.failuresRemaining = 3;
    const result = await runGauntlet("Keep breaking");
    expect(mocks.instructions).toHaveLength(3);
    expect(mocks.scripts).toEqual(["typecheck:userland", "typecheck:userland", "typecheck:userland"]);
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.resetHard).toHaveBeenCalledOnce();
    expect(mocks.writeFile).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ outcome: "reverted", retries: 2, failureReason: "broken type" });
  });
});
