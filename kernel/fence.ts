import { ALLOWLIST_GLOBS } from "./config.js";

export interface FenceResult {
  ok: boolean;
  violations: string[];
}

export function checkFence(changedFiles: string[]): FenceResult {
  const allowedPrefix = ALLOWLIST_GLOBS[0].slice(0, -2);
  const violations = changedFiles.filter((file) => {
    const normalized = file.replaceAll("\\", "/");
    return normalized.includes("..") || !normalized.startsWith(allowedPrefix) || normalized === allowedPrefix;
  });

  return { ok: violations.length === 0, violations };
}
