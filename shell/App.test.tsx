/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import App, { changelogHeadline, relativeDate, suggestions } from "./App.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class FakeEventSource {
  static current: FakeEventSource | undefined;
  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor(readonly url: string) { FakeEventSource.current = this; }
  addEventListener(name: string, listener: EventListener) {
    const listeners = this.listeners.get(name) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(name, listeners);
  }
  removeEventListener(name: string, listener: EventListener) { this.listeners.get(name)?.delete(listener); }
  close() {}
  emit(name: string, data: object) {
    const event = new MessageEvent(name, { data: JSON.stringify(data) });
    for (const listener of this.listeners.get(name) ?? []) listener(event);
  }
}

const originalEventSource = globalThis.EventSource;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.EventSource = originalEventSource;
  globalThis.fetch = originalFetch;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("shell", () => {
  it("renders the isolated dashboard, request workshop, and all suggestions", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Sema — tell Sikia what to change.");
    expect(html).toContain("Your Sikia dashboard");
    expect(html).toContain("The story of your dashboard");
    const host = document.createElement("div");
    host.innerHTML = html;
    for (const suggestion of suggestions) expect(host.textContent).toContain(suggestion);
  });

  it("turns git revert subjects into calm changelog copy", () => {
    expect(changelogHeadline('Revert "Show me what\'s due first"')).toBe("Put back: 'Show me what's due first'");
    expect(changelogHeadline("Fanya maandishi makubwa")).toBe("Fanya maandishi makubwa");
  });

  it("formats recent history relatively", () => {
    expect(relativeDate("2026-07-17T12:00:00.000Z", Date.parse("2026-07-17T12:02:00.000Z"))).toBe("2 minutes ago");
  });

  it("streams the workshop stages and preserves both reverted meanings", async () => {
    globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/shell-config") return new Response(JSON.stringify({ userlandUrl: "http://localhost:5173/userland/" }));
      if (url === "/log") return new Response(JSON.stringify([
        { sha: "abc1234", message: "Fanya maandishi makubwa", date: "2026-07-17T12:00:00.000Z", files: ["userland/src/tokens.ts"] },
        { sha: "def5678", message: "Internal build work", date: "2026-07-17T11:00:00.000Z", files: ["kernel/server.ts"] },
      ]));
      return new Response(JSON.stringify({ accepted: true }));
    }) as typeof fetch;
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<App />));
    const source = FakeEventSource.current;
    expect(source?.url).toBe("/events");
    expect(host.textContent).toContain("Fanya maandishi makubwa");
    expect(host.textContent).not.toContain("Internal build work");

    await act(async () => source?.emit("status", { message: "Heard you — working on it." }));
    expect(host.querySelector("textarea")?.disabled).toBe(true);
    await act(async () => source?.emit("plan", { message: "A small, careful adjustment." }));
    await act(async () => source?.emit("diff", { message: "update src/tokens.ts" }));
    await act(async () => source?.emit("diff", { files: ["userland/src/tokens.ts"] }));
    expect(host.textContent).toContain("update src/tokens.ts");
    expect(host.textContent).toContain("Checking the work");
    await act(async () => source?.emit("done", { message: "Done — it's yours." }));
    expect(host.querySelector("textarea")?.disabled).toBe(false);
    expect(host.textContent).toContain("Done — it's yours.");

    await act(async () => source?.emit("reverted", { message: "I couldn't work out how to do that one — nothing's changed." }));
    expect(host.textContent).toContain("Nothing changed");
    expect(host.textContent).toContain("nothing's changed");
    await act(async () => source?.emit("reverted", { message: "That didn't work — I've put everything back the way it was" }));
    expect(host.textContent).toContain("Put back safely");
    expect(host.textContent).toContain("put everything back");
    await act(async () => root.unmount());
  });
});
