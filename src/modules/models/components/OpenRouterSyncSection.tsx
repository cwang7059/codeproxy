import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { formatSyncTimestamp, type OpenRouterModelSyncState } from "@/modules/models/models-page-helpers";
import { Button } from "@/modules/ui/Button";
import { TextInput } from "@/modules/ui/Input";
import { ToggleSwitch } from "@/modules/ui/ToggleSwitch";

export type OpenRouterSyncSectionProps = {
  syncState: OpenRouterModelSyncState;
  loading: boolean;
  saving: boolean;
  running: boolean;
  error: string | null;
  syncIntervalHours: string;
  onSyncIntervalHoursChange: (value: string) => void;
  onSaveSettings: (enabled: boolean) => void | Promise<void>;
  onRunSync: () => void | Promise<void>;
};

export function OpenRouterSyncSection({
  syncState,
  loading,
  saving,
  running,
  error,
  syncIntervalHours,
  onSyncIntervalHoursChange,
  onSaveSettings,
  onRunSync,
}: OpenRouterSyncSectionProps) {
  const { t } = useTranslation();
  const skipSyncIntervalBlurRef = useRef(false);

  return (
    <div
      data-testid="openrouter-sync-section"
      className="mb-3 border-b border-slate-200 pb-3 dark:border-neutral-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-900 dark:text-white">
            <span>{t("models_page.openrouter_sync_title")}</span>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                syncState.enabled
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-white/[0.08] dark:text-white/45",
              ].join(" ")}
            >
              {syncState.enabled
                ? t("models_page.openrouter_sync_auto_on")
                : t("models_page.openrouter_sync_auto_off")}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-white/55">
            <span>
              {t("models_page.openrouter_sync_last_sync", {
                value: formatSyncTimestamp(
                  syncState.lastSyncAt,
                  t("models_page.openrouter_sync_never"),
                ),
              })}
            </span>
            <span>
              {t("models_page.openrouter_sync_result", {
                seen: syncState.lastSeen,
                added: syncState.lastAdded,
                updated: syncState.lastUpdated,
                skipped: syncState.lastSkipped,
              })}
            </span>
            {loading ? <span>{t("models_page.loading")}</span> : null}
          </div>
          {syncState.lastError || error ? (
            <div className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {t("models_page.openrouter_sync_error", {
                error: error || syncState.lastError,
              })}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-28">
            <label
              htmlFor="openrouter-sync-interval"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-white/60"
            >
              {t("models_page.openrouter_sync_interval")}
            </label>
            <TextInput
              id="openrouter-sync-interval"
              type="number"
              value={syncIntervalHours}
              onChange={(e) => onSyncIntervalHoursChange(e.target.value)}
              onBlur={() => {
                if (skipSyncIntervalBlurRef.current) {
                  skipSyncIntervalBlurRef.current = false;
                  return;
                }
                void onSaveSettings(syncState.enabled);
              }}
              min={1}
              step={1}
              size="sm"
            />
          </div>
          <div
            onMouseDownCapture={() => {
              skipSyncIntervalBlurRef.current = true;
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <ToggleSwitch
              checked={syncState.enabled}
              onCheckedChange={(enabled) => void onSaveSettings(enabled)}
              label={t("models_page.openrouter_sync_auto")}
              disabled={saving}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => void onRunSync()}
              disabled={running || syncState.running || loading}
            >
              <RefreshCw
                size={14}
                className={running || syncState.running ? "animate-spin" : ""}
              />
              {t("models_page.openrouter_sync_now")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
