import { apiKeyEntriesApi } from "@/lib/http/apis/api-keys";
import type { PanelRole } from "@/lib/http/apis/panel-auth";
import {
  applyDesktopCodexIntegration,
  type DesktopCodexStatus,
} from "@/lib/desktop";
import { isPanelAdmin } from "@/lib/panel-role";

export const LOCAL_DEV_KEY = "local-dev-key";
const LOCAL_DEV_KEY_ID = "local-dev-key";

function findLocalDevKeyEntry(
  entries: Awaited<ReturnType<typeof apiKeyEntriesApi.list>>,
) {
  return entries.find((entry) => String(entry.key ?? "").trim() === LOCAL_DEV_KEY);
}

function isUniqueIdConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("UNIQUE constraint failed: api_keys.id");
}

async function ensureLocalDevKey(): Promise<void> {
  const entries = await apiKeyEntriesApi.list();
  const existing = findLocalDevKeyEntry(entries);

  if (existing && !existing.disabled) {
    return;
  }

  if (existing?.disabled) {
    await apiKeyEntriesApi.delete({ key: LOCAL_DEV_KEY });
  }

  try {
    await apiKeyEntriesApi.update({
      match: LOCAL_DEV_KEY,
      value: {
        id: LOCAL_DEV_KEY_ID,
        key: LOCAL_DEV_KEY,
        name: existing?.name?.trim() || "Local Codex Dev",
        "created-at": existing?.["created-at"] || new Date().toISOString(),
      },
    });
  } catch (error) {
    if (!isUniqueIdConstraintError(error)) {
      throw error;
    }

    const refreshed = await apiKeyEntriesApi.list().catch(() => entries);
    const refreshedKey = findLocalDevKeyEntry(refreshed);
    if (refreshedKey && !refreshedKey.disabled) {
      return;
    }

    throw error;
  }
}

export async function resolveCodexApiKey(role: PanelRole | null): Promise<string> {
  if (isPanelAdmin(role)) {
    await ensureLocalDevKey();
    return LOCAL_DEV_KEY;
  }

  const entries = await apiKeyEntriesApi.list();
  const owned = entries.find((entry) => !entry.disabled && String(entry.key ?? "").trim());
  if (!owned?.key) {
    throw new Error("codex_no_api_key");
  }
  return String(owned.key).trim();
}

export async function connectDesktopCodex(
  apiBase: string,
  role: PanelRole | null = "admin",
): Promise<DesktopCodexStatus> {
  const apiKey = await resolveCodexApiKey(role);
  const status = await applyDesktopCodexIntegration(apiBase, apiKey);
  if (!status) {
    throw new Error("codex_connect_failed");
  }
  return status;
}
