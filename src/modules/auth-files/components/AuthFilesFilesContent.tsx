import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AuthFileItem } from "@/lib/http/types";
import { isRuntimeOnlyAuthFile } from "@/modules/auth-files/helpers/authFilesPageUtils";
import type { FilesViewMode } from "@/modules/auth-files/helpers/authFilesPageUtils";
import { AuthFilesFileCard, type AuthFilesFileCardProps } from "@/modules/auth-files/components/AuthFilesFileCard";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { EmptyState } from "@/modules/ui/EmptyState";
import { VirtualTable, type VirtualTableColumn } from "@/modules/ui/VirtualTable";

type AuthFilesFilesContentProps = {
  loading: boolean;
  filesLength: number;
  pageItems: AuthFileItem[];
  filesViewMode: FilesViewMode;
  renderFilesViewModeTabs: ReactNode;
  selectableFilteredFiles: AuthFileItem[];
  selectedCount: number;
  allPageSelected: boolean;
  allFilteredSelected: boolean;
  selectablePageNames: string[];
  selectCurrentPage: (checked: boolean) => void;
  selectFilteredFiles: (checked: boolean) => void;
  fileColumns: VirtualTableColumn<AuthFileItem>[];
  selectedFileNameSet: Set<string>;
  fileCardProps: Omit<AuthFilesFileCardProps, "file" | "fileSelected">;
};

export function AuthFilesFilesContent({
  loading,
  filesLength,
  pageItems,
  filesViewMode,
  renderFilesViewModeTabs,
  selectableFilteredFiles,
  selectedCount,
  allPageSelected,
  allFilteredSelected,
  selectablePageNames,
  selectCurrentPage,
  selectFilteredFiles,
  fileColumns,
  selectedFileNameSet,
  fileCardProps,
}: AuthFilesFilesContentProps) {
  const { t } = useTranslation();

  if (loading && filesLength === 0) {
    return (
      <Card padding="none" className="relative overflow-hidden">
        <div className="p-4 sm:p-5" data-testid="auth-files-table-skeleton">
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={`s-${idx}`}
                className="h-[84px] rounded-xl bg-slate-50/80 transition-colors duration-200 ease-out motion-safe:animate-pulse dark:bg-white/[0.03]"
              />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (pageItems.length === 0) {
    return (
      <EmptyState
        title={t("auth_files_page.no_files")}
        description={t("auth_files_page.no_files_desc")}
      />
    );
  }

  return (
    <Card padding="none" className="relative overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className={loading && filesLength === 0 ? "pointer-events-none opacity-60" : ""}>
            {renderFilesViewModeTabs}
          </div>
          {selectableFilteredFiles.length > 0 && selectedCount === 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="!h-8 px-2 text-xs"
                onClick={() => selectCurrentPage(!allPageSelected)}
                disabled={selectablePageNames.length === 0}
              >
                {allPageSelected
                  ? t("auth_files.batch_deselect_page")
                  : t("auth_files.batch_select_page")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="!h-8 px-2 text-xs"
                onClick={() => selectFilteredFiles(!allFilteredSelected)}
                disabled={selectableFilteredFiles.length === 0}
              >
                {allFilteredSelected
                  ? t("auth_files.batch_deselect_filtered")
                  : t("auth_files.batch_select_filtered")}
              </Button>
            </div>
          ) : null}
        </div>

        {filesViewMode === "table" ? (
          <VirtualTable<AuthFileItem>
            rows={pageItems}
            columns={fileColumns}
            rowKey={(row) => row.name}
            loading={false}
            virtualize={false}
            rowHeight={84}
            caption={t("auth_files.table_caption")}
            emptyText={t("auth_files_page.no_files_desc")}
            minWidth="min-w-[1960px]"
            height="h-[calc(100dvh-452px)]"
            rowClassName={(row) => {
              const runtimeOnly = isRuntimeOnlyAuthFile(row);
              const disabled = Boolean(row.disabled);
              const selected = selectedFileNameSet.has(row.name);
              return [
                selected
                  ? "bg-slate-100/80 dark:bg-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.1]"
                  : "",
                runtimeOnly
                  ? "bg-slate-50/80 dark:bg-neutral-950/55 hover:bg-slate-100/80 dark:hover:bg-neutral-900/60"
                  : "",
                disabled ? "opacity-85" : "",
              ]
                .filter(Boolean)
                .join(" ");
            }}
          />
        ) : (
          <div
            data-testid="auth-files-cards"
            className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {pageItems.map((file) => (
              <AuthFilesFileCard
                key={file.name}
                file={file}
                fileSelected={selectedFileNameSet.has(file.name)}
                {...fileCardProps}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
