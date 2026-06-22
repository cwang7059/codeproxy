import { useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import {

  BarChart3,

  ChevronDown,

  ChevronUp,

  CircleHelp,

  MoreHorizontal,

  Plus,

  RefreshCw,

  Search,

  Settings2,

  Upload,

} from "lucide-react";

import { Button } from "@/modules/ui/Button";

import { Card } from "@/modules/ui/Card";

import { TextInput } from "@/modules/ui/Input";

import { HoverTooltip } from "@/modules/ui/Tooltip";

import { Select } from "@/modules/ui/Select";

import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";

import type {

  AuthFilesSortMode,

  OAuthDialogTab,

  QuotaAutoRefreshMs,

} from "@/modules/auth-files/helpers/authFilesPageUtils";

import {

  hasActiveAuthFilesAdvancedFilters,

  normalizeAuthFilesSortMode,

  normalizeProviderKey,

  readAuthFilesAdvancedFiltersExpanded,

  writeAuthFilesAdvancedFiltersExpanded,

} from "@/modules/auth-files/helpers/authFilesPageUtils";

import type { AuthFileItem } from "@/lib/http/types";



export type AuthFilesFiltersCardProps = {

  filterChips: string[];

  filter: string;

  setFilter: (value: string) => void;

  filterCounts: { total: number; counts: Record<string, number> };

  planFilterChips: string[];

  planFilter: string;

  setPlanFilter: (value: string) => void;

  planFilterCounts: { total: number; counts: Record<string, number> };

  sortMode: AuthFilesSortMode;

  setSortMode: (value: AuthFilesSortMode) => void;

  canSetModelOwnerGroup: boolean;

  selectedModelOwner: string;

  onOpenModelOwnerDialog: () => void;

  search: string;

  setSearch: (value: string) => void;

  quotaLastUpdatedText: string;

  loading: boolean;

  filesLength: number;

  quotaAutoRefreshMs: QuotaAutoRefreshMs;

  setQuotaAutoRefreshMsRaw: (value: number) => void;

  normalizeQuotaAutoRefreshMs: (value: unknown) => QuotaAutoRefreshMs;

  refreshFilesAndQuota: () => Promise<void>;

  usageLoading: boolean;

  refreshingAll: boolean;

  uploading: boolean;

  onUploadClick: () => void;

  onOpenOAuthDialog: (tab: OAuthDialogTab) => void;

  openGroupOverview: () => void;

  groupOverviewLoading: boolean;

  filteredFiles: AuthFileItem[];

  formatPlanTypeLabel: (planType: string) => string;

};



export function AuthFilesFiltersCard({

  filterChips,

  filter,

  setFilter,

  filterCounts,

  planFilterChips,

  planFilter,

  setPlanFilter,

  planFilterCounts,

  sortMode,

  setSortMode,

  canSetModelOwnerGroup,

  selectedModelOwner,

  onOpenModelOwnerDialog,

  search,

  setSearch,

  quotaLastUpdatedText,

  loading,

  filesLength,

  quotaAutoRefreshMs,

  setQuotaAutoRefreshMsRaw,

  normalizeQuotaAutoRefreshMs,

  refreshFilesAndQuota,

  usageLoading,

  refreshingAll,

  uploading,

  onUploadClick,

  onOpenOAuthDialog,

  openGroupOverview,

  groupOverviewLoading,

  filteredFiles,

  formatPlanTypeLabel,

}: AuthFilesFiltersCardProps) {

  const { t } = useTranslation();

  const [actionsOpen, setActionsOpen] = useState(false);

  const actionsRef = useRef<HTMLDivElement | null>(null);

  const userCollapsedAdvancedRef = useRef(false);

  const [advancedExpanded, setAdvancedExpanded] = useState(() =>

    readAuthFilesAdvancedFiltersExpanded(),

  );



  const hasActiveAdvancedFilters = hasActiveAuthFilesAdvancedFilters({

    planFilter,

    sortMode,

    selectedModelOwner,

  });



  useEffect(() => {

    if (userCollapsedAdvancedRef.current) return;

    if (canSetModelOwnerGroup || hasActiveAdvancedFilters) {

      setAdvancedExpanded(true);

      writeAuthFilesAdvancedFiltersExpanded(true);

    }

  }, [canSetModelOwnerGroup, hasActiveAdvancedFilters]);



  useEffect(() => {

    if (!actionsOpen) return;



    const handlePointerDown = (event: MouseEvent) => {

      if (!actionsRef.current?.contains(event.target as Node)) {

        setActionsOpen(false);

      }

    };



    const handleEscape = (event: KeyboardEvent) => {

      if (event.key === "Escape") {

        setActionsOpen(false);

      }

    };



    document.addEventListener("mousedown", handlePointerDown);

    document.addEventListener("keydown", handleEscape);

    return () => {

      document.removeEventListener("mousedown", handlePointerDown);

      document.removeEventListener("keydown", handleEscape);

    };

  }, [actionsOpen]);



  const openOAuthFromFilter = () => {

    const normalized = normalizeProviderKey(filter);

    const oauthTab =

      normalized === "codex" ||

      normalized === "anthropic" ||

      normalized === "antigravity" ||

      normalized === "gemini-cli" ||

      normalized === "kimi" ||

      normalized === "qwen"

        ? (normalized as OAuthDialogTab)

        : "codex";

    onOpenOAuthDialog(oauthTab);

  };



  const toggleAdvancedExpanded = () => {

    setAdvancedExpanded((prev) => {

      const next = !prev;

      userCollapsedAdvancedRef.current = !next;

      writeAuthFilesAdvancedFiltersExpanded(next);

      return next;

    });

  };



  const controlsDisabled = loading && filesLength === 0;



  return (

    <Card padding="compact">

      <div className="flex flex-col gap-3">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">

          <div className="w-full space-y-1.5 lg:flex-1">

            <p className="text-[11px] font-semibold text-slate-600 dark:text-white/65">

              {t("auth_files.search")}

            </p>

            <TextInput

              value={search}

              onChange={(e) => setSearch(e.currentTarget.value)}

              placeholder={t("auth_files_page.filename_hint")}

              endAdornment={<Search size={16} className="text-slate-400" />}

            />

          </div>



          <div className="flex flex-wrap items-center gap-1.5">

            <HoverTooltip content={t("auth_files.upload")}>

              <Button

                variant="secondary"

                size="sm"

                onClick={onUploadClick}

                disabled={uploading}

                aria-label={t("auth_files.upload")}

                title={t("auth_files.upload")}

              >

                <Upload size={15} />

              </Button>

            </HoverTooltip>

            <Button

              variant="primary"

              size="sm"

              onClick={openOAuthFromFilter}

              aria-label={t("auth_files_page.add_oauth")}

              title={t("auth_files_page.add_oauth")}

              className="gap-1.5"

            >

              <Plus size={15} aria-hidden="true" />

              <span>{t("auth_files_page.add_oauth")}</span>

            </Button>

            <HoverTooltip content={t("auth_files.refresh")}>

              <Button

                variant="secondary"

                size="sm"

                onClick={() => void refreshFilesAndQuota()}

                disabled={loading || usageLoading || refreshingAll}

                aria-label={t("auth_files.refresh")}

                title={t("auth_files.refresh")}

              >

                <RefreshCw

                  size={15}

                  className={loading || usageLoading || refreshingAll ? "animate-spin" : ""}

                />

              </Button>

            </HoverTooltip>

            <div className="relative" ref={actionsRef}>

              <Button

                variant="ghost"

                size="sm"

                aria-expanded={actionsOpen}

                aria-haspopup="menu"

                aria-label={t("auth_files.more_actions")}

                title={t("auth_files.more_actions")}

                onClick={() => setActionsOpen((prev) => !prev)}

              >

                <MoreHorizontal size={15} aria-hidden="true" />

              </Button>

              {actionsOpen ? (

                <div

                  role="menu"

                  aria-label={t("auth_files.more_actions")}

                  className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)] dark:border-neutral-800 dark:bg-neutral-950"

                >

                  <button

                    type="button"

                    role="menuitem"

                    onClick={() => {

                      openGroupOverview();

                      setActionsOpen(false);

                    }}

                    disabled={loading || groupOverviewLoading || filteredFiles.length === 0}

                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white/80 dark:hover:bg-white/10"

                  >

                    <BarChart3 size={15} className={groupOverviewLoading ? "animate-pulse" : ""} />

                    {t("auth_files.group_overview_button")}

                  </button>

                </div>

              ) : null}

            </div>

          </div>

        </div>



        <div className="w-fit max-w-full space-y-1.5">

          <div className="flex items-center gap-2">

            <p className="text-[11px] font-semibold text-slate-600 dark:text-white/65">

              {t("auth_files.type_filter")}

            </p>

            <HoverTooltip content={t("auth_files.count_hint")} placement="top">

              <span

                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 dark:text-white/45"

                aria-label={t("auth_files.count_info")}

              >

                <CircleHelp size={14} />

              </span>

            </HoverTooltip>

          </div>

          <Tabs value={filter} onValueChange={setFilter}>

            <TabsList>

              {filterChips.map((key) => {

                const active = filter === key;

                const normalizedKey = normalizeProviderKey(key);

                const count =

                  key === "all" ? filterCounts.total : (filterCounts.counts[normalizedKey] ?? 0);

                const label = key === "all" ? t("auth_files.all") : key;

                const countClass = active

                  ? "bg-black/[0.06] text-[#18181B] dark:bg-white/12 dark:text-white"

                  : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70";

                return (

                  <TabsTrigger key={key} value={key}>

                    {label}

                    <span

                      className={[

                        "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",

                        countClass,

                      ].join(" ")}

                    >

                      {count}

                    </span>

                  </TabsTrigger>

                );

              })}

            </TabsList>

          </Tabs>

        </div>



        <div className="border-t border-slate-100 pt-3 dark:border-neutral-800/60">

          <button

            type="button"

            data-testid="auth-files-advanced-filters-toggle"

            aria-expanded={advancedExpanded}

            onClick={toggleAdvancedExpanded}

            className="flex w-full items-start justify-between gap-3 text-left"

          >

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <p className="text-xs font-semibold text-slate-700 dark:text-white/80">

                  {t("auth_files.advanced_filters")}

                </p>

                {!advancedExpanded && hasActiveAdvancedFilters ? (

                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">

                    {t("auth_files.advanced_filters_active")}

                  </span>

                ) : null}

              </div>

              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-white/45">

                {t("auth_files.advanced_filters_desc")}

              </p>

            </div>

            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-white/55">

              {advancedExpanded

                ? t("auth_files.hide_advanced_filters")

                : t("auth_files.show_advanced_filters")}

              {advancedExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}

            </span>

          </button>



          {advancedExpanded ? (

            <div className="mt-3 space-y-3">

              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-end">

                {planFilterChips.length > 1 ? (

                  <div className="w-fit max-w-full space-y-1.5">

                    <p className="text-[11px] font-semibold text-slate-600 dark:text-white/65">

                      {t("auth_files.account_type_filter")}

                    </p>

                    <Tabs value={planFilter} onValueChange={setPlanFilter}>

                      <TabsList>

                        {planFilterChips.map((key) => {

                          const active = planFilter === key;

                          const normalizedKey = normalizeProviderKey(key);

                          const count =

                            key === "all"

                              ? planFilterCounts.total

                              : (planFilterCounts.counts[normalizedKey] ?? 0);

                          const label =

                            key === "all" ? t("auth_files.all") : formatPlanTypeLabel(key);

                          const countClass = active

                            ? "bg-black/[0.06] text-[#18181B] dark:bg-white/12 dark:text-white"

                            : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70";

                          return (

                            <TabsTrigger key={key} value={key}>

                              {label}

                              <span

                                className={[

                                  "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",

                                  countClass,

                                ].join(" ")}

                              >

                                {count}

                              </span>

                            </TabsTrigger>

                          );

                        })}

                      </TabsList>

                    </Tabs>

                  </div>

                ) : null}



                <div className="w-full max-w-[190px] space-y-1.5 sm:w-[190px]">

                  <p className="text-[11px] font-semibold text-slate-600 dark:text-white/65">

                    {t("auth_files.sort")}

                  </p>

                  <Select

                    value={sortMode}

                    onChange={(value) => setSortMode(normalizeAuthFilesSortMode(value))}

                    options={[

                      { value: "name", label: t("auth_files.sort_name") },

                      { value: "usage_desc", label: t("auth_files.sort_usage_desc") },

                      { value: "usage_asc", label: t("auth_files.sort_usage_asc") },

                    ]}

                    aria-label={t("auth_files.sort")}

                  />

                </div>



                {canSetModelOwnerGroup ? (

                  <div className="flex items-end">

                    <HoverTooltip content={t("auth_files.model_owner_group")} placement="top">

                      <Button

                        variant="secondary"

                        size="sm"

                        className="relative !h-9 !w-9 px-0"

                        onClick={onOpenModelOwnerDialog}

                        aria-label={t("auth_files.model_owner_group")}

                      >

                        <Settings2 size={15} />

                        {selectedModelOwner ? (

                          <span

                            aria-hidden="true"

                            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900"

                          />

                        ) : null}

                      </Button>

                    </HoverTooltip>

                  </div>

                ) : null}

              </div>



              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-white/45">

                  <span className="font-medium">{t("auth_files.quota_updated_at")}</span>

                  <span className="font-mono tabular-nums">

                    {controlsDisabled ? "--" : quotaLastUpdatedText}

                  </span>

                </div>



                <div className="inline-flex items-center gap-1.5">

                  <span className="text-xs font-medium text-slate-500 dark:text-white/45">

                    {t("auth_files.quota_auto_refresh")}

                  </span>

                  <div className={controlsDisabled ? "pointer-events-none opacity-60" : ""}>

                    <Select

                      value={String(quotaAutoRefreshMs)}

                      onChange={(value) =>

                        setQuotaAutoRefreshMsRaw(normalizeQuotaAutoRefreshMs(value))

                      }

                      options={[

                        { value: "0", label: t("auth_files.quota_refresh_off") },

                        { value: "5000", label: "5s" },

                        { value: "10000", label: "10s" },

                        { value: "30000", label: "30s" },

                        { value: "60000", label: "60s" },

                      ]}

                      aria-label={t("auth_files.quota_auto_refresh")}

                      variant="chip"

                      className="w-[88px]"

                    />

                  </div>

                </div>

              </div>

            </div>

          ) : null}

        </div>

      </div>

    </Card>

  );

}


