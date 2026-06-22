import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AuthFileModelOwnerGroup } from "@/modules/auth-files/helpers/authFilesPageUtils";
import { Button } from "@/modules/ui/Button";
import { EmptyState } from "@/modules/ui/EmptyState";
import { Modal } from "@/modules/ui/Modal";
import { SearchableSelect, type SearchableSelectOption } from "@/modules/ui/SearchableSelect";

export type AuthFilesModelOwnerGroupModalProps = {
  open: boolean;
  normalizedFilter: string;
  canSetModelOwnerGroup: boolean;
  modelOwnerGroupsLoading: boolean;
  modelOwnerGroups: AuthFileModelOwnerGroup[];
  draftModelOwner: string;
  onDraftModelOwnerChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function AuthFilesModelOwnerGroupModal({
  open,
  normalizedFilter,
  canSetModelOwnerGroup,
  modelOwnerGroupsLoading,
  modelOwnerGroups,
  draftModelOwner,
  onDraftModelOwnerChange,
  onClose,
  onSave,
}: AuthFilesModelOwnerGroupModalProps) {
  const { t } = useTranslation();

  const draftModelOwnerGroup =
    draftModelOwner === ""
      ? null
      : (modelOwnerGroups.find((group) => group.value === draftModelOwner) ?? null);

  const modelOwnerOptions = useMemo<SearchableSelectOption[]>(
    () => [
      {
        value: "",
        label: t("auth_files.auth_file_models_option"),
        searchText: t("auth_files.auth_file_models_option"),
      },
      ...modelOwnerGroups.map((group) => ({
        value: group.value,
        label: group.label,
        searchText: `${group.value} ${group.label} ${group.description}`,
      })),
    ],
    [modelOwnerGroups, t],
  );

  return (
    <Modal
      open={open}
      title={t("auth_files.model_owner_group")}
      description={canSetModelOwnerGroup ? normalizedFilter : undefined}
      maxWidth="max-w-3xl"
      bodyHeightClassName="max-h-[68vh]"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={onSave}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-white/80">
              {t("auth_files.model_owner_group")}
            </label>
            <SearchableSelect
              value={draftModelOwner}
              onChange={onDraftModelOwnerChange}
              options={modelOwnerOptions}
              placeholder={t("auth_files.auth_file_models_option")}
              searchPlaceholder={t("auth_files.model_owner_group_search_placeholder")}
              aria-label={t("auth_files.model_owner_group")}
            />
          </div>

          <div className="flex min-w-0 items-center rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-neutral-800 dark:bg-white/[0.04]">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-slate-400 dark:text-white/35">
                {t("auth_files.type_filter")}
              </p>
              <p className="mt-1 truncate font-mono text-sm font-semibold text-slate-900 dark:text-white">
                {normalizedFilter}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("auth_files.detail_tab_models")}
            </p>
            {draftModelOwnerGroup ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-white/65">
                {t("auth_files.count_items", { count: draftModelOwnerGroup.models.length })}
              </span>
            ) : null}
          </div>

          {modelOwnerGroupsLoading ? (
            <div className="text-sm text-slate-600 dark:text-white/65">
              {t("common.loading_ellipsis")}
            </div>
          ) : draftModelOwnerGroup ? (
            draftModelOwnerGroup.models.length === 0 ? (
              <EmptyState
                title={t("common.no_model_data")}
                description={t("auth_files.no_owner_group_models")}
              />
            ) : (
              <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                {draftModelOwnerGroup.models.map((model) => {
                  const modelMeta = [
                    model.display_name ? `display_name: ${model.display_name}` : "",
                    model.owned_by ? `owned_by: ${model.owned_by}` : "",
                  ].filter(Boolean);
                  return (
                    <div
                      key={model.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-neutral-800 dark:bg-white/[0.03]"
                    >
                      <p className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-white">
                        {model.id}
                      </p>
                      {modelMeta.length > 0 ? (
                        <p className="mt-1 truncate text-xs text-slate-600 dark:text-white/55">
                          {modelMeta.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <EmptyState
              title={t("common.no_model_data")}
              description={t("auth_files.auth_file_models_option")}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
