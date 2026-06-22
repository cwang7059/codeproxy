import type {
  ClaudeIdentityFingerprint,
  CodexIdentityFingerprint,
} from "@/lib/http/apis/identity-fingerprint";

export type ProviderTab = "codex" | "claude" | "gemini" | "kimi";

export const PROVIDERS: Array<{ id: ProviderTab; labelKey: string }> = [
  { id: "codex", labelKey: "identity_fingerprint.tab_codex" },
  { id: "claude", labelKey: "identity_fingerprint.tab_claude" },
  { id: "gemini", labelKey: "identity_fingerprint.tab_gemini" },
  { id: "kimi", labelKey: "identity_fingerprint.tab_kimi" },
];

export const SESSION_MODE_OPTIONS = [
  { value: "per-request", labelKey: "identity_fingerprint.session_per_request" },
  { value: "server-stable", labelKey: "identity_fingerprint.session_server_stable" },
  { value: "fixed", labelKey: "identity_fingerprint.session_fixed" },
] as const;

export const EMPTY_CODEX: Required<CodexIdentityFingerprint> = {
  enabled: false,
  "user-agent": "",
  version: "",
  originator: "",
  "websocket-beta": "",
  "session-mode": "per-request",
  "session-id": "",
  "custom-headers": {},
};

export const EMPTY_CLAUDE: Required<ClaudeIdentityFingerprint> = {
  enabled: false,
  "cli-version": "2.1.88",
  entrypoint: "cli",
  "user-agent": "claude-cli/2.1.88 (external, cli)",
  "anthropic-beta":
    "claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,redact-thinking-2026-02-12,context-management-2025-06-27,prompt-caching-scope-2026-01-05,advanced-tool-use-2025-11-20,effort-2025-11-24",
  "stainless-package-version": "0.74.0",
  "stainless-runtime-version": "v22.13.0",
  "stainless-timeout": "600",
  "session-mode": "per-request",
  "session-id": "",
  "device-id": "",
  "custom-headers": {},
};

export type KimiHeaderDefaults = {
  "user-agent": string;
  platform: string;
  version: string;
};

export const DEFAULT_KIMI_HEADERS: KimiHeaderDefaults = {
  "user-agent": "KimiCLI/1.10.6",
  platform: "kimi_cli",
  version: "1.10.6",
};

export const DEFAULT_GEMINI_HEADERS: Record<string, string> = {
  "User-Agent": "google-api-nodejs-client/9.15.1",
  "X-Goog-Api-Client": "gl-node/22.17.0",
};

export type HeaderPreviewLine = { name: string; value: string };

export const PREVIEW_GRID_CLASS = "grid gap-3 xl:grid-cols-[minmax(0,1fr)_min(100%,400px)]";
