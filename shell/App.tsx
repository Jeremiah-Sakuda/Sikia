import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Status = "idle" | "working" | "done" | "refused" | "reverted";

interface LogEntry {
  sha: string;
  message: string;
  date: string;
  files: string[];
}

interface EventPayload {
  message?: string;
  files?: string[];
}

export const suggestions = [
  "Make everything easier to read",
  "Warmer colors, less white",
  "Color my bills by which paycheck they land after",
  "Show me what's due first",
  "Thicker lines on the chart and a bigger legend",
  "Fanya maandishi makubwa",
] as const;

const statusCopy: Record<Status, string> = {
  idle: "The workshop is ready when you are.",
  working: "Working carefully — you can watch the change take shape.",
  done: "Done — it's yours.",
  refused: "That part isn't mine to change — it keeps everything else safe.",
  reverted: "That didn't work — I've put everything back the way it was.",
};

export function changelogHeadline(message: string) {
  const reverted = message.match(/^Revert "(.+)"$/);
  return reverted?.[1] === undefined ? message : `Put back: '${reverted[1]}'`;
}

export function relativeDate(value: string, now = Date.now()) {
  const elapsedSeconds = Math.round((new Date(value).getTime() - now) / 1_000);
  const ranges = [
    [60, 1, "second"],
    [3_600, 60, "minute"],
    [86_400, 3_600, "hour"],
    [604_800, 86_400, "day"],
    [2_628_000, 604_800, "week"],
    [31_536_000, 2_628_000, "month"],
    [Number.POSITIVE_INFINITY, 31_536_000, "year"],
  ] as const;
  const [, divisor, unit] = ranges.find(([limit]) => Math.abs(elapsedSeconds) < limit) ?? ranges[0];
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(elapsedSeconds / divisor), unit);
}

function readPayload(event: Event): EventPayload {
  if (!(event instanceof MessageEvent) || typeof event.data !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(event.data);
    if (typeof parsed !== "object" || parsed === null) return {};
    const record = parsed as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : undefined;
    const files = Array.isArray(record.files) ? record.files.filter((file): file is string => typeof file === "string") : undefined;
    return { ...(message === undefined ? {} : { message }), ...(files === undefined ? {} : { files }) };
  } catch {
    return {};
  }
}

function isLogEntry(value: unknown): value is LogEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.sha === "string"
    && typeof record.message === "string"
    && typeof record.date === "string"
    && Array.isArray(record.files)
    && record.files.every((file) => typeof file === "string");
}

function elapsedLabel(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export default function App() {
  const [request, setRequest] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [phase, setPhase] = useState(0);
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalCopy, setFinalCopy] = useState(statusCopy.idle);
  const [plan, setPlan] = useState("");
  const [changeLines, setChangeLines] = useState<string[]>([]);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [userlandUrl, setUserlandUrl] = useState("/userland/");
  const startedAt = useRef<number | null>(null);

  const loadLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const response = await fetch("/log");
      if (!response.ok) throw new Error("History unavailable");
      const value: unknown = await response.json();
      const history = Array.isArray(value) ? value.filter(isLogEntry) : [];
      setEntries(history.filter((entry) => entry.files.length > 0 && entry.files.every((file) => file.startsWith("userland/src/"))));
    } catch {
      setEntries([]);
    } finally {
      setLogLoading(false);
    }
  }, []);

  const begin = useCallback(() => {
    startedAt.current = Date.now();
    setElapsedMs(0);
    setBusy(true);
    setStatus("working");
    setFinalCopy(statusCopy.working);
    setPhase(1);
    setPlan("");
    setChangeLines([]);
  }, []);

  const finish = useCallback((nextStatus: Exclude<Status, "idle" | "working">, message?: string) => {
    if (startedAt.current !== null) setElapsedMs(Date.now() - startedAt.current);
    startedAt.current = null;
    setBusy(false);
    setStatus(nextStatus);
    setFinalCopy(message ?? statusCopy[nextStatus]);
    setPhase(5);
    void loadLog();
  }, [loadLog]);

  useEffect(() => {
    void loadLog();
    void fetch("/shell-config")
      .then((response) => response.json() as Promise<unknown>)
      .then((value) => {
        if (typeof value === "object" && value !== null && "userlandUrl" in value && typeof value.userlandUrl === "string") {
          setUserlandUrl(value.userlandUrl);
        }
      })
      .catch(() => undefined);
  }, [loadLog]);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => {
      if (startedAt.current !== null) setElapsedMs(Date.now() - startedAt.current);
    }, 250);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    const source = new EventSource("/events");
    const listeners: Array<[string, EventListener]> = [];
    const listen = (name: string, handler: (payload: EventPayload) => void) => {
      const listener: EventListener = (event) => handler(readPayload(event));
      source.addEventListener(name, listener);
      listeners.push([name, listener]);
    };

    listen("status", ({ message }) => {
      if (message === "Event stream connected") return;
      if (startedAt.current === null) begin();
      setFinalCopy(message ?? statusCopy.working);
    });
    listen("plan", ({ message }) => {
      setPhase(2);
      if (message !== undefined) setPlan(message);
    });
    listen("diff", ({ message, files }) => {
      if (files !== undefined) {
        setPhase(4);
        setChangeLines((current) => [...current, ...files.map((file) => `review ${file}`)]);
      } else {
        setPhase(3);
        if (message !== undefined) setChangeLines((current) => [...current, ...message.split("\n")]);
      }
    });
    listen("done", ({ message }) => finish("done", message ?? statusCopy.done));
    listen("refused", ({ message }) => finish("refused", message ?? statusCopy.refused));
    listen("reverted", ({ message }) => finish("reverted", message ?? statusCopy.reverted));

    return () => {
      for (const [name, listener] of listeners) source.removeEventListener(name, listener);
      source.close();
    };
  }, [begin, finish]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = request.trim();
    if (text.length === 0 || busy) return;
    begin();
    try {
      const response = await fetch("/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (response.status === 409) {
        setFinalCopy("Someone else is at the bench. I'll show you when they're finished.");
        return;
      }
      if (!response.ok) finish("reverted", "I couldn't start that one — nothing's changed.");
    } catch {
      finish("reverted", "I couldn't reach the workshop — nothing's changed.");
    }
  }

  async function undo(sha: string) {
    if (busy) return;
    begin();
    setFinalCopy("Putting that change back carefully.");
    try {
      const response = await fetch(`/revert/${sha}`, { method: "POST" });
      if (response.status === 409) {
        setFinalCopy("Someone else is at the bench. I'll show you when they're finished.");
        return;
      }
      if (!response.ok) finish("reverted");
      else await loadLog();
    } catch {
      finish("reverted", "I couldn't reach the workshop — nothing's changed.");
    }
  }

  const noOp = status === "reverted" && finalCopy.toLowerCase().includes("nothing's changed");
  const finalLabel = status === "idle" || status === "working" ? "Final state" : status === "done" ? "Done" : status === "refused" ? "Not mine to change" : noOp ? "Nothing changed" : "Put back safely";
  const steps = ["Heard you", "Planning", "Making the change", "Checking the work", finalLabel];

  return (
    <main className="shell-frame">
      <section className="canvas-panel" aria-label="Your dashboard">
        <header className="canvas-header">
          <div>
            <p className="eyebrow">Sikia</p>
            <h1>Your money, in one place.</h1>
          </div>
          <span className="canvas-status"><i /> Live canvas</span>
        </header>
        <div className="iframe-wrap">
          <iframe src={userlandUrl} title="Your Sikia dashboard" />
        </div>
      </section>

      <aside className="workshop-column">
        <section className="request-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The workshop</p>
              <h2>What should fit better?</h2>
            </div>
            <span className={`state-badge state-${status}`}>{status}</span>
          </div>
          <form onSubmit={submit}>
            <label className="sr-only" htmlFor="request">Tell Sikia what to change</label>
            <textarea
              disabled={busy}
              id="request"
              onChange={(event) => setRequest(event.target.value)}
              placeholder="Sema — tell Sikia what to change."
              rows={4}
              value={request}
            />
            <button className="submit-button" disabled={busy || request.trim().length === 0} type="submit">
              {busy ? "The bench is busy" : "Make it mine"}
            </button>
          </form>
          <div className="suggestions" aria-label="Suggested requests">
            {suggestions.map((suggestion) => (
              <button disabled={busy} key={suggestion} onClick={() => setRequest(suggestion)} type="button">{suggestion}</button>
            ))}
          </div>
        </section>

        <section className={`workshop-card state-${status}`} aria-live="polite">
          <div className="workshop-topline">
            <div>
              <p className="eyebrow">On the bench</p>
              <h2>{finalCopy}</h2>
            </div>
            <time>{elapsedLabel(elapsedMs)}</time>
          </div>
          <ol className="timeline">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const stepState = phase > stepNumber ? "complete" : phase === stepNumber ? "current" : "waiting";
              return <li className={stepState} key={`${index}-${step}`}><span>{stepNumber}</span><strong>{step}</strong></li>;
            })}
          </ol>
          {plan.length > 0 && <p className="plan-note">{plan}</p>}
          <div className="change-panel">
            <div className="change-panel-heading"><span>What's changing</span><span>{changeLines.length} notes</span></div>
            <pre>{changeLines.length === 0 ? "The first marks will appear here as the work takes shape." : changeLines.join("\n")}</pre>
          </div>
        </section>

        <section className="changelog-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Changelog</p>
              <h2>The story of your dashboard</h2>
            </div>
            <button className="text-button" onClick={() => void loadLog()} type="button">Refresh</button>
          </div>
          <div className="log-list">
            {logLoading && entries.length === 0 && <p className="empty-log">Opening the workshop ledger…</p>}
            {!logLoading && entries.length === 0 && <p className="empty-log">Your first change will appear here.</p>}
            {entries.map((entry) => (
              <article className="log-entry" key={entry.sha}>
                <div>
                  <h3>{changelogHeadline(entry.message)}</h3>
                  <p>{relativeDate(entry.date)} · {entry.files.length} {entry.files.length === 1 ? "file" : "files"} touched</p>
                </div>
                <button disabled={busy} onClick={() => void undo(entry.sha)} type="button">Undo</button>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
