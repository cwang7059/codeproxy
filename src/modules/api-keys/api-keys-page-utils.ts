import type { ApiKeyEntry } from "@/lib/http/apis/api-keys";

export type ApiKeysPageTab = "keys" | "ccswitch-import";

export type ApiKeyStatusFilter = "" | "active" | "disabled";

export type ApiKeyPageStats = {
  total: number;
  active: number;
  disabled: number;
  restricted: number;
};

function isRestrictedEntry(entry: ApiKeyEntry): boolean {
  return Boolean(
    entry["daily-limit"] ||
      entry["total-quota"] ||
      entry["spending-limit"] ||
      entry["rpm-limit"] ||
      entry["tpm-limit"] ||
      entry["allowed-models"]?.length ||
      entry["allowed-channel-groups"]?.length ||
      entry["allowed-channels"]?.length,
  );
}

export function computeApiKeyPageStats(entries: ApiKeyEntry[]): ApiKeyPageStats {
  let active = 0;
  let disabled = 0;
  let restricted = 0;

  for (const entry of entries) {
    if (entry.disabled) disabled += 1;
    else active += 1;
    if (isRestrictedEntry(entry)) restricted += 1;
  }

  return {
    total: entries.length,
    active,
    disabled,
    restricted,
  };
}

export function filterApiKeyEntries(
  entries: ApiKeyEntry[],
  search: string,
  statusFilter: ApiKeyStatusFilter,
): ApiKeyEntry[] {
  const query = search.trim().toLowerCase();

  return entries.filter((entry) => {
    if (statusFilter === "active" && entry.disabled) return false;
    if (statusFilter === "disabled" && !entry.disabled) return false;
    if (!query) return true;

    const haystack = [entry.name, entry.key].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export function resolveApiKeysPageTab(searchParams: URLSearchParams): ApiKeysPageTab {
  return searchParams.get("tab") === "ccswitch-import" ? "ccswitch-import" : "keys";
}

function normalizeRoutePath(path: string): string {
  const trimmed = String(path ?? "").trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

export function appendRoutePath(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = normalizeRoutePath(path);
  if (!normalizedPath) return normalizedBase;
  if (normalizedBase.toLowerCase().endsWith(normalizedPath.toLowerCase())) {
    return normalizedBase;
  }
  return `${normalizedBase}${normalizedPath}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.opacity = "0";
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export function computeTableViewportHeight(rowCount: number): number {
  const headerHeight = 48;
  const rowHeight = 44;
  const contentHeight = rowCount * rowHeight + headerHeight;
  const maxHeight = typeof window !== "undefined" ? Math.round(window.innerHeight * 0.58) : 720;
  return Math.min(Math.max(contentHeight, 200), maxHeight);
}
