export const MANAGEMENT_API_PREFIX = "/v0/management";
export const DEFAULT_API_PORT = 8317;
export const DEFAULT_API_BASE = (import.meta.env.VITE_DEFAULT_API_BASE ?? "").trim();
export const HIDE_API_BASE = import.meta.env.VITE_HIDE_API_BASE === "true";
export const REQUEST_TIMEOUT_MS = 30000;
export const AUTH_STORAGE_KEY = "code-proxy-admin-auth";
export const THEME_STORAGE_KEY = "code-proxy-admin-theme";
export const VERSION_HEADER_KEYS = ["x-cpa-version", "x-server-version"];
export const BUILD_DATE_HEADER_KEYS = ["x-cpa-build-date", "x-server-build-date"];
