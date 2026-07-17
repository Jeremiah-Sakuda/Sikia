import { afterEach, describe, expect, it, vi } from "vitest";
import { instructionForCodex, needsEnglishTranslation } from "./codex.js";

const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

describe("instruction translation", () => {
  it("passes English instructions through without an API call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(instructionForCodex("Make the text bigger")).resolves.toBe("Make the text bigger");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("detects the two Swahili taxonomy requests", () => {
    expect(needsEnglishTranslation("Fanya maandishi makubwa.")).toBe(true);
    expect(needsEnglishTranslation("Ongeza ukubwa wa maandishi na ufanye mistari ya chati iwe minene.")).toBe(true);
  });

  it("translates once while retaining concrete values", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: [{ content: [{ type: "output_text", text: "Make the text size 18 and use cream #faf6f0." }] }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(instructionForCodex("Fanya maandishi 18 na cream #faf6f0.")).resolves.toBe(
      "Make the text size 18 and use cream #faf6f0.",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("requires the documented judge prerequisite for non-English requests", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(instructionForCodex("Fanya maandishi makubwa.")).rejects.toThrow("OPENAI_API_KEY");
  });
});
