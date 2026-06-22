import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Download, Eye, RefreshCw, Tags } from "lucide-react";
import type { AuthFileItem } from "@/lib/http/types";
import {
  TYPE_BADGE_CLASSES,
  formatModified,
  isRuntimeOnlyAuthFile,
  resolveAuthFileDisplayName,
  resolveAuthFilePlanType,
  resolveAuthFileSupplementalTags,
  resolveFileType,
  shouldShowAuthFileDisplayTag,
  type UsageIndex,
} from "@/modules/auth-files/helpers/authFilesPageUtils";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { HoverTooltip } from "@/modules/ui/Tooltip";
import { ToggleSwitch } from "@/modules/ui/ToggleSwitch";
import type { QuotaProvider } from "@/modules/quota/quota-fetch";
import type { QuotaItem, QuotaState } from "@/modules/quota/quota-helpers";

export type AuthFilesFileCardProps = {
  file: AuthFileItem;
  fileSelected: boolean;
  quotaByFileName: Record<string, QuotaState>;
  usageIndex: UsageIndex;
  statusUpdating: Record<string, boolean>;
  formatPlanTypeLabel: (planType: string) => string;
  translateQuotaText: (text: string) => string;
  renderRestrictionBadges: (file: AuthFileItem) => ReactNode | null;
  renderSubscriptionBadge: (file: AuthFileItem) => ReactNode | null;
  renderQuotaBar: (label: string, item: QuotaItem | null) => ReactNode;
  resolveQuotaProvider: (file: AuthFileItem) => QuotaProvider | null;
  resolveQuotaCardSlots: (
    provider: QuotaProvider,
    items: QuotaItem[],
  ) => { id: string; label: string; item: QuotaItem | null }[];
  resolveAuthFileStats: (
    file: AuthFileItem,
    index: UsageIndex,
  ) => { success: number; failure: number };
  refreshQuota: (file: AuthFileItem, provider: QuotaProvider) => Promise<void>;
  setFileEnabled: (file: AuthFileItem, enabled: boolean) => Promise<void>;
  toggleFileSelection: (name: string, checked: boolean) => void;
  openTagsEditor: (file: AuthFileItem) => void;
  openDetail: (file: AuthFileItem) => Promise<void>;
  downloadAuthFile: (file: AuthFileItem) => Promise<void>;
};

export function AuthFilesFileCard({
  file,
  fileSelected,
  quotaByFileName,
  usageIndex,
  statusUpdating,
  formatPlanTypeLabel,
  translateQuotaText,
  renderRestrictionBadges,
  renderSubscriptionBadge,
  renderQuotaBar,
  resolveQuotaProvider,
  resolveQuotaCardSlots,
  resolveAuthFileStats,
  refreshQuota,
  setFileEnabled,
  toggleFileSelection,
  openTagsEditor,
  openDetail,
  downloadAuthFile,
}: AuthFilesFileCardProps) {
  const { t } = useTranslation();

  const runtimeOnly = isRuntimeOnlyAuthFile(file);
  const fileDisabled = Boolean(file.disabled);
  const typeKey = resolveFileType(file);
  const badgeClass = TYPE_BADGE_CLASSES[typeKey] ?? TYPE_BADGE_CLASSES.unknown;
  const displayTitle = resolveAuthFileDisplayName(file) || String(file.name || "");
  const provider = resolveQuotaProvider(file);
  const state = quotaByFileName[file.name] ?? { status: "idle", items: [] };
  const planType = resolveAuthFilePlanType(file, state);
  const displayTags = resolveAuthFileSupplementalTags(file, state);
  const showTypeBadge = shouldShowAuthFileDisplayTag(file, typeKey);
  const showPlanBadge = planType ? shouldShowAuthFileDisplayTag(file, planType) : false;
  const subscriptionBadge = renderSubscriptionBadge(file);
  const stats = resolveAuthFileStats(file, usageIndex);
  const totalCalls = stats.success + stats.failure;

  const items = Array.isArray(state.items) ? (state.items as QuotaItem[]) : [];
  const slots = provider ? resolveQuotaCardSlots(provider, items) : [];
  const quotaRefreshing = provider ? quotaByFileName[file.name]?.status === "loading" : false;

  return (
    <Card
      padding="default"
      bodyClassName="mt-0 flex min-h-0 flex-1 flex-col"
      className={[
        "group flex h-full flex-col transition-colors duration-200 ease-out hover:border-slate-300 hover:bg-white dark:hover:border-neutral-700 dark:hover:bg-neutral-950/70",
        fileSelected
          ? "border-slate-900 ring-1 ring-slate-300 dark:border-white dark:ring-white/20"
          : "",
        runtimeOnly ? "opacity-90" : "",
        fileDisabled ? "opacity-85" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            {!runtimeOnly ? (
              <input
                type="checkbox"
                aria-label={t("auth_files.select_file", {
                  name: displayTitle || file.name,
                })}
                checked={fileSelected}
                onChange={(e) => toggleFileSelection(file.name, e.currentTarget.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 accent-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400/35 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:accent-white dark:focus-visible:ring-white/15"
              />
            ) : null}
            <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
              {displayTitle}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {runtimeOnly ? (
              <span className="text-xs text-slate-400 dark:text-white/40">--</span>
            ) : (
              <ToggleSwitch
                ariaLabel={t("auth_files.enable_disable")}
                checked={!fileDisabled}
                onCheckedChange={(enabled) => void setFileEnabled(file, enabled)}
                disabled={Boolean(statusUpdating[file.name])}
              />
            )}
          </div>
        </div>

        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          {showTypeBadge ? (
            <span
              className={[
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                badgeClass,
              ].join(" ")}
            >
              {typeKey}
            </span>
          ) : null}
          {showPlanBadge && planType ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
              {t("codex_quota.plan_label")} {formatPlanTypeLabel(planType)}
            </span>
          ) : null}
          <span className="text-[11px] tabular-nums text-slate-500 dark:text-white/50">
            {t("auth_files.calls_count", { count: totalCalls })}
          </span>
          {renderRestrictionBadges(file)}
          {subscriptionBadge}
          {runtimeOnly ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-white dark:text-neutral-950">
              {t("auth_files.virtual_auth_file")}
            </span>
          ) : null}
        </div>
        {displayTags.length > 0 ? (
          <div className="min-w-0 flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className="truncate text-[11px] text-slate-500 dark:text-white/45">{formatModified(file)}</p>
      </div>

      <div
        className="mt-4 min-w-0 rounded-2xl border border-slate-200/80 bg-slate-100/80 px-3 py-3 transition-colors duration-200 ease-out dark:border-white/[0.06] dark:bg-white/[0.05]"
        data-testid="auth-file-card-quota"
      >
        {provider && (state.status === "error" || state.error) ? (
          <p className="truncate text-[11px] font-semibold text-rose-700 dark:text-rose-200">
            {translateQuotaText(state.error ?? t("common.error"))}
          </p>
        ) : null}

        {!provider ? (
          <div className="text-xs text-slate-400 dark:text-white/40">--</div>
        ) : slots.length > 0 ? (
          <div className="space-y-2.5">
            {slots.map((slot) => renderQuotaBar(slot.label, slot.item))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 dark:text-white/40">--</div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <div className="inline-flex items-center gap-1">
          {provider ? (
            <HoverTooltip content={t("common.refresh")}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void refreshQuota(file, provider)}
                title={t("common.refresh")}
                aria-label={t("common.refresh")}
              >
                <RefreshCw size={16} className={quotaRefreshing ? "animate-spin" : ""} />
              </Button>
            </HoverTooltip>
          ) : null}

          <HoverTooltip content={t("auth_files.edit_tags")}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openTagsEditor(file)}
              title={t("auth_files.edit_tags")}
              aria-label={t("auth_files.edit_tags")}
            >
              <Tags size={16} />
            </Button>
          </HoverTooltip>

          <HoverTooltip content={t("auth_files.view")}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void openDetail(file)}
              title={t("auth_files.view")}
              aria-label={t("auth_files.view")}
            >
              <Eye size={16} />
            </Button>
          </HoverTooltip>

          <HoverTooltip content={t("auth_files.download")}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void downloadAuthFile(file)}
              title={t("auth_files.download")}
              aria-label={t("auth_files.download")}
            >
              <Download size={16} />
            </Button>
          </HoverTooltip>
        </div>
      </div>
    </Card>
  );
}
