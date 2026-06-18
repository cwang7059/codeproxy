import type { ApiKeyEntry } from "@/lib/http/apis/api-keys";

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
