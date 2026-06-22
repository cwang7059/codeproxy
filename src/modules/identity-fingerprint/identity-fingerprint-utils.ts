import type { TFunction } from "i18next";
import { parse as parseYaml } from "yaml";
import type {
  ClaudeIdentityFingerprint,
  CodexIdentityFingerprint,
} from "@/lib/http/apis/identity-fingerprint";
import {
  DEFAULT_GEMINI_HEADERS,
  DEFAULT_KIMI_HEADERS,
  EMPTY_CLAUDE,
  EMPTY_CODEX,
  type KimiHeaderDefaults,
} from "@/modules/identity-fingerprint/identity-fingerprint-constants";

export function mergeCodex(
  base: CodexIdentityFingerprint | undefined,
): Required<CodexIdentityFingerprint> {
  return {
    ...EMPTY_CODEX,
    ...base,
    "custom-headers": base?.["custom-headers"] ?? {},
  };
}

export function mergeClaude(
  base: ClaudeIdentityFingerprint | undefined,
): Required<ClaudeIdentityFingerprint> {
  return {
    ...EMPTY_CLAUDE,
    ...base,
    "custom-headers": base?.["custom-headers"] ?? {},
  };
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function readString(obj: Record<string, unknown> | null, key: string, fallback = ""): string {
  const value = obj?.[key];
  return typeof value === "string" ? value : fallback;
}

export function toHeaderMap(raw: unknown): Record<string, string> {
  const record = asRecord(raw);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, value]) => [key.trim(), String(value ?? "").trim()])
      .filter(([key, value]) => key !== "" && value !== ""),
  );
}

export function parseCustomHeaders(raw: string): Record<string, string> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("custom headers must be a JSON object");
  }
  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
}

export function parseHeadersJson(raw: string): Record<string, string> {
  return parseCustomHeaders(raw);
}

export function parseConfigYaml(raw: string): Record<string, unknown> {
  const parsed = parseYaml(raw) as unknown;
  return asRecord(parsed) ?? {};
}

export function normalizeKimiHeaders(raw: unknown): KimiHeaderDefaults {
  const record = asRecord(raw);
  return {
    "user-agent": readString(record, "user-agent", DEFAULT_KIMI_HEADERS["user-agent"]),
    platform: readString(record, "platform", DEFAULT_KIMI_HEADERS.platform),
    version: readString(record, "version", DEFAULT_KIMI_HEADERS.version),
  };
}

export function firstGeminiHeaders(raw: unknown): { headers: Record<string, string>; count: number } {
  const entries = Array.isArray(raw) ? raw : [];
  for (const entry of entries) {
    const record = asRecord(entry);
    const headers = toHeaderMap(record?.headers);
    if (Object.keys(headers).length > 0) {
      return { headers, count: entries.length };
    }
  }
  return { headers: DEFAULT_GEMINI_HEADERS, count: entries.length };
}

function setHeadersObject(obj: Record<string, unknown>, value: Record<string, string>): void {
  const next = Object.fromEntries(
    Object.entries(value)
      .map(([key, val]) => [key.trim(), String(val ?? "").trim()])
      .filter(([key, val]) => key !== "" && val !== ""),
  );
  if (Object.keys(next).length > 0) {
    obj.headers = next;
    return;
  }
  if (hasOwn(obj, "headers")) delete obj.headers;
}

export function upsertGeminiHeaders(
  root: Record<string, unknown>,
  headers: Record<string, string>,
): { root: Record<string, unknown>; count: number } {
  const rawEntries = Array.isArray(root["gemini-api-key"]) ? root["gemini-api-key"] : [];
  if (rawEntries.length === 0) {
    throw new Error("No Gemini API key entries found in config.yaml");
  }

  root["gemini-api-key"] = rawEntries.map((entry) => {
    const record = asRecord(entry);
    const next = record ? { ...record } : { "api-key": String(entry ?? "") };
    setHeadersObject(next, headers);
    return next;
  });

  return { root, count: rawEntries.length };
}

export function sessionPreviewValue(mode: string, sessionId: string, t: TFunction): string {
  if (mode === "per-request") return t("identity_fingerprint.session_per_request");
  if (mode === "fixed") {
    return sessionId || t("identity_fingerprint.preview_server_generated");
  }
  return t("identity_fingerprint.session_server_stable");
}

export function tryParseCustomHeaders(raw: string): Record<string, string> {
  try {
    return parseCustomHeaders(raw);
  } catch {
    return {};
  }
}

export function tryParseHeadersJson(raw: string): Record<string, string> {
  try {
    return parseHeadersJson(raw);
  } catch {
    return {};
  }
}
