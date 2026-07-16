import { spawn, type ChildProcess } from "node:child_process";

const children: ChildProcess[] = [
  spawn("tsx", ["kernel/server.ts"], { stdio: "inherit" }),
  spawn("vite", ["--config", "userland/vite.config.ts"], { stdio: "inherit" }),
];

function stop(signal: NodeJS.Signals): void {
  for (const child of children) child.kill(signal);
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));

const code = await Promise.race(children.map((child) => new Promise<number>((resolve) => {
  child.once("error", () => resolve(1));
  child.once("close", (exitCode) => resolve(exitCode ?? 1));
})));
stop("SIGTERM");
process.exitCode = code;
