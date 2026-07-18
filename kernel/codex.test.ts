import { afterEach, describe, expect, it, vi } from "vitest";
import { instructionForCodex } from "./codex.js";

const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

describe("instruction translation", () => {
  function mockTranslation(text: string): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: [{ content: [{ type: "output_text", text }] }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("routes English through the API and returns it verbatim", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = mockTranslation("Make the text bigger");
    await expect(instructionForCodex("Make the text bigger")).resolves.toBe("Make the text bigger");
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toMatchObject({
      instructions: "If this text is not English, translate it to English preserving intent exactly; if it is English, return it verbatim.",
      input: "Make the text bigger",
    });
  });

  it("translates the first Swahili taxonomy request", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = mockTranslation("Make the text bigger.");
    await expect(instructionForCodex("Fanya maandishi makubwa.")).resolves.toBe("Make the text bigger.");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("translates the second Swahili taxonomy request", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = mockTranslation("Make the chart lines thicker and its legend larger.");
    await expect(instructionForCodex("Ongeza unene wa mistari ya chati na ufanye maelezo yake yawe makubwa.")).resolves.toBe(
      "Make the chart lines thicker and its legend larger.",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("translates novel Swahili absent from the taxonomy", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = mockTranslation("Show me the bills that are still unpaid.");
    await expect(instructionForCodex("Nionyeshe bili ambazo bado hazijalipwa.")).resolves.toBe(
      "Show me the bills that are still unpaid.",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("requires the documented judge prerequisite for every request", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(instructionForCodex("Make the text bigger")).rejects.toThrow("OPENAI_API_KEY");
  });
});
