import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SHELL_DIR = resolve(ROOT_DIR, "shell/dist");
export const USERLAND_DIR = resolve(ROOT_DIR, "userland");
export const HARDENING_LOG_PATH = resolve(ROOT_DIR, "hardening-log.json");
export const USERLAND_DEV_URL = process.env.USERLAND_DEV_URL ?? "http://localhost:5173/userland/";

export const ALLOWLIST_GLOBS = ["userland/src/**"] as const;
export const RETRY_LIMIT = 2;
export const CODEX_TIMEOUT_MS = 180_000;
export const TOTAL_REQUEST_TIMEOUT_MS = 240_000;
