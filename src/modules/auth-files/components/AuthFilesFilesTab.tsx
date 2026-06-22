import { useEffect, useState, type RefObject, type ReactNode } from "react";
import type { AuthFileItem } from "@/lib/http/types";
import { AuthFilesBatchActionsBar, AuthFilesPaginationFooter } from "@/modules/auth-files/components/AuthFilesFilesFooter";
import { AuthFilesFilesContent } from "@/modules/auth-files/components/AuthFilesFilesContent";
import { AuthFilesFiltersCard } from "@/modules/auth-files/components/AuthFilesFiltersCard";
import { AuthFilesModelOwnerGroupModal } from "@/modules/auth-files/components/AuthFilesModelOwnerGroupModal";
import { AuthFilesOverviewStats } from "@/modules/auth-files/components/AuthFilesOverviewStats";
import type {
  AuthFileModelOwnerGroup,
  AuthFilesSortMode,
  FilesViewMode,
  OAuthDialogTab,
  QuotaAutoRefreshMs,
  UsageIndex,
} from "@/modules/auth-files/helpers/authFilesPageUtils";
import { normalizeProviderKey } from "@/modules/auth-files/helpers/authFilesPageUtils";
import type { QuotaProvider } from "@/modules/quota/quota-fetch";
import type { QuotaItem, QuotaState } from "@/modules/quota/quota-helpers";
import type { VirtualTableColumn } from "@/modules/ui/VirtualTable";

interface AuthFilesFilesTabProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleUpload: (input: FileList | File[] | null) => Promise<void>;
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
  modelOwnerGroupsLoading: boolean;
  modelOwnerGroups: AuthFileModelOwnerGroup[];
  selectedModelOwner: string;
  setSelectedModelOwner: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  quotaLastUpdatedText: string;
  loading: boolean;
  filesLength: number;
  renderFilesViewModeTabs: ReactNode;
  quotaAutoRefreshMs: QuotaAutoRefreshMs;
  setQuotaAutoRefreshMsRaw: (value: number) => void;
  normalizeQuotaAutoRefreshMs: (value: unknown) => QuotaAutoRefreshMs;
  openGroupOverview: () => void;
  groupOverviewLoading: boolean;
  filteredFiles: AuthFileItem[];
  refreshFilesAndQuota: () => Promise<void>;
  usageLoading: boolean;
  refreshingAll: boolean;
  uploading: boolean;
  setOauthDialogDefaultTab: (tab: OAuthDialogTab) => void;
  setOauthDialogOpen: (open: boolean) => void;
  selectableFilteredFiles: AuthFileItem[];
  selectedCount: number;
  selectCurrentPage: (checked: boolean) => void;
  allPageSelected: boolean;
  selectablePageNames: string[];
  selectFilteredFiles: (checked: boolean) => void;
  allFilteredSelected: boolean;
  setSelectedFileNames: (value: string[]) => void;
  setConfirm: (value: null | { type: "deleteSelection"; names: string[] }) => void;
  selectedFileNames: string[];
  deletingAll: boolean;
  pageItems: AuthFileItem[];
  fileColumns: VirtualTableColumn<AuthFileItem>[];
  filesViewMode: FilesViewMode;
  selectedFileNameSet: Set<string>;
  quotaByFileName: Record<string, QuotaState>;
  resolveQuotaProvider: (file: AuthFileItem) => QuotaProvider | null;
  resolveQuotaCardSlots: (
    provider: QuotaProvider,
    items: QuotaItem[],
  ) => { id: string; label: string; item: QuotaItem | null }[];
  refreshQuota: (file: AuthFileItem, provider: QuotaProvider) => Promise<void>;
  setFileEnabled: (file: AuthFileItem, enabled: boolean) => Promise<void>;
  statusUpdating: Record<string, boolean>;
  usageIndex: UsageIndex;
  resolveAuthFileStats: (
    file: AuthFileItem,
    index: UsageIndex,
  ) => { success: number; failure: number };
  toggleFileSelection: (name: string, checked: boolean) => void;
  formatPlanTypeLabel: (planType: string) => string;
  translateQuotaText: (text: string) => string;
  renderRestrictionBadges: (file: AuthFileItem) => ReactNode | null;
  renderSubscriptionBadge: (file: AuthFileItem) => ReactNode | null;
  renderQuotaBar: (label: string, item: QuotaItem | null) => ReactNode;
  openTagsEditor: (file: AuthFileItem) => void;
  openDetail: (file: AuthFileItem) => Promise<void>;
  downloadAuthFile: (file: AuthFileItem) => Promise<void>;
  safePage: number;
  totalPages: number;
  setPage: (value: number | ((prev: number) => number)) => void;
  usageData: unknown;
}

export function AuthFilesFilesTab({
  fileInputRef,
  handleUpload,
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
  modelOwnerGroupsLoading,
  modelOwnerGroups,
  selectedModelOwner,
  setSelectedModelOwner,
  search,
  setSearch,
  quotaLastUpdatedText,
  loading,
  filesLength,
  renderFilesViewModeTabs,
  quotaAutoRefreshMs,
  setQuotaAutoRefreshMsRaw,
  normalizeQuotaAutoRefreshMs,
  openGroupOverview,
  groupOverviewLoading,
  filteredFiles,
  refreshFilesAndQuota,
  usageLoading,
  refreshingAll,
  uploading,
  setOauthDialogDefaultTab,
  setOauthDialogOpen,
  selectableFilteredFiles,
  selectedCount,
  selectCurrentPage,
  allPageSelected,
  selectablePageNames,
  selectFilteredFiles,
  allFilteredSelected,
  setSelectedFileNames,
  setConfirm,
  selectedFileNames,
  deletingAll,
  pageItems,
  fileColumns,
  filesViewMode,
  selectedFileNameSet,
  quotaByFileName,
  resolveQuotaProvider,
  resolveQuotaCardSlots,
  refreshQuota,
  setFileEnabled,
  statusUpdating,
  usageIndex,
  resolveAuthFileStats,
  toggleFileSelection,
  formatPlanTypeLabel,
  translateQuotaText,
  renderRestrictionBadges,
  renderSubscriptionBadge,
  renderQuotaBar,
  openTagsEditor,
  openDetail,
  downloadAuthFile,
  safePage,
  totalPages,
  setPage,
  usageData,
}: AuthFilesFilesTabProps) {
  const [modelOwnerDialogOpen, setModelOwnerDialogOpen] = useState(false);
  const [draftModelOwner, setDraftModelOwner] = useState(selectedModelOwner);

  const normalizedFilter = normalizeProviderKey(filter);
  const canSetModelOwnerGroup = normalizedFilter !== "all";

  useEffect(() => {
    if (!modelOwnerDialogOpen) {
      setDraftModelOwner(selectedModelOwner);
    }
  }, [modelOwnerDialogOpen, selectedModelOwner]);

  return (
    <div className="mt-3 space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        multiple
        className="hidden"
        onChange={(e) => void handleUpload(e.currentTarget.files)}
      />

      <AuthFilesOverviewStats
        filteredFiles={filteredFiles}
        quotaByFileName={quotaByFileName}
        usageIndex={usageIndex}
        loading={loading}
        filesLength={filesLength}
      />

      <AuthFilesFiltersCard
        filterChips={filterChips}
        filter={filter}
        setFilter={setFilter}
        filterCounts={filterCounts}
        planFilterChips={planFilterChips}
        planFilter={planFilter}
        setPlanFilter={setPlanFilter}
        planFilterCounts={planFilterCounts}
        sortMode={sortMode}
        setSortMode={setSortMode}
        canSetModelOwnerGroup={canSetModelOwnerGroup}
        selectedModelOwner={selectedModelOwner}
        onOpenModelOwnerDialog={() => {
          setDraftModelOwner(selectedModelOwner);
          setModelOwnerDialogOpen(true);
        }}
        search={search}
        setSearch={setSearch}
        quotaLastUpdatedText={quotaLastUpdatedText}
        loading={loading}
        filesLength={filesLength}
        quotaAutoRefreshMs={quotaAutoRefreshMs}
        setQuotaAutoRefreshMsRaw={setQuotaAutoRefreshMsRaw}
        normalizeQuotaAutoRefreshMs={normalizeQuotaAutoRefreshMs}
        refreshFilesAndQuota={refreshFilesAndQuota}
        usageLoading={usageLoading}
        refreshingAll={refreshingAll}
        uploading={uploading}
        onUploadClick={() => fileInputRef.current?.click()}
        onOpenOAuthDialog={(tab) => {
          setOauthDialogDefaultTab(tab);
          setOauthDialogOpen(true);
        }}
        openGroupOverview={openGroupOverview}
        groupOverviewLoading={groupOverviewLoading}
        filteredFiles={filteredFiles}
        formatPlanTypeLabel={formatPlanTypeLabel}
      />

      <AuthFilesFilesContent
        loading={loading}
        filesLength={filesLength}
        pageItems={pageItems}
        filesViewMode={filesViewMode}
        renderFilesViewModeTabs={renderFilesViewModeTabs}
        selectableFilteredFiles={selectableFilteredFiles}
        selectedCount={selectedCount}
        allPageSelected={allPageSelected}
        allFilteredSelected={allFilteredSelected}
        selectablePageNames={selectablePageNames}
        selectCurrentPage={selectCurrentPage}
        selectFilteredFiles={selectFilteredFiles}
        fileColumns={fileColumns}
        selectedFileNameSet={selectedFileNameSet}
        fileCardProps={{
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
        }}
      />

      <AuthFilesBatchActionsBar
        selectedCount={selectedCount}
        allPageSelected={allPageSelected}
        allFilteredSelected={allFilteredSelected}
        selectablePageNames={selectablePageNames}
        selectableFilteredFilesLength={selectableFilteredFiles.length}
        deletingAll={deletingAll}
        selectCurrentPage={selectCurrentPage}
        selectFilteredFiles={selectFilteredFiles}
        onClearSelection={() => setSelectedFileNames([])}
        onDeleteSelection={() =>
          setConfirm({ type: "deleteSelection", names: [...selectedFileNames] })
        }
      />

      <AuthFilesPaginationFooter
        filteredFilesCount={filteredFiles.length}
        safePage={safePage}
        totalPages={totalPages}
        setPage={setPage}
        usageData={usageData}
      />

      <AuthFilesModelOwnerGroupModal
        open={modelOwnerDialogOpen}
        normalizedFilter={normalizedFilter}
        canSetModelOwnerGroup={canSetModelOwnerGroup}
        modelOwnerGroupsLoading={modelOwnerGroupsLoading}
        modelOwnerGroups={modelOwnerGroups}
        draftModelOwner={draftModelOwner}
        onDraftModelOwnerChange={setDraftModelOwner}
        onClose={() => setModelOwnerDialogOpen(false)}
        onSave={() => {
          setSelectedModelOwner(draftModelOwner);
          setModelOwnerDialogOpen(false);
        }}
      />
    </div>
  );
}
