import { useTranslation } from "react-i18next";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { TextInput } from "@/modules/ui/Input";
import type { ModelOwnerPreset } from "@/modules/models/models-page-helpers";

export type ModelOwnerSidebarProps = {
  totalModelCount: number;
  libraryOwners: ModelOwnerPreset[];
  filteredLibraryOwners: ModelOwnerPreset[];
  ownerModelCounts: Map<string, number>;
  ownerFilter: string;
  ownerSearchFilter: string;
  onOwnerFilterChange: (value: string) => void;
  onOwnerSearchFilterChange: (value: string) => void;
  onAddOwner: () => void;
  onEditOwner: (owner: ModelOwnerPreset) => void;
  onDeleteOwner: (owner: ModelOwnerPreset) => void;
  compact?: boolean;
};

export function ModelOwnerSidebar({
  totalModelCount,
  libraryOwners,
  filteredLibraryOwners,
  ownerModelCounts,
  ownerFilter,
  ownerSearchFilter,
  onOwnerFilterChange,
  onOwnerSearchFilterChange,
  onAddOwner,
  onEditOwner,
  onDeleteOwner,
  compact = false,
}: ModelOwnerSidebarProps) {
  const { t } = useTranslation();

  return (
    <div
      data-testid="owner-sidebar-card"
      className={compact ? "h-full max-h-80 min-h-0 min-w-0" : "h-full min-h-0 min-w-0"}
    >
      <Card
        title={t("models_page.model_owners")}
        className="flex h-full min-h-0 flex-col overflow-hidden"
        bodyClassName={compact ? "flex max-h-80 min-h-0 flex-1 flex-col gap-2" : "flex min-h-0 flex-1 flex-col gap-2"}
        actions={
          <Button
            variant="secondary"
            size="xs"
            onClick={onAddOwner}
            aria-label={t("models_page.add_owner")}
            title={t("models_page.add_owner")}
          >
            <Plus size={13} />
            {t("models_page.add_owner")}
          </Button>
        }
      >
        <TextInput
          value={ownerSearchFilter}
          onChange={(e) => onOwnerSearchFilterChange(e.target.value)}
          placeholder={t("models_page.owner_sidebar_search_placeholder")}
          size="sm"
          startAdornment={<Search size={14} className="text-slate-400 dark:text-white/35" />}
        />

        <button
          type="button"
          onClick={() => onOwnerFilterChange("")}
          className={[
            "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
            ownerFilter === ""
              ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08]",
          ].join(" ")}
        >
          <span className="min-w-0 truncate font-medium">{t("models_page.all_owners")}</span>
          <span
            className={[
              "shrink-0 rounded-full px-2 py-0.5 text-[11px]",
              ownerFilter === ""
                ? "bg-white/15 text-white/80 dark:bg-slate-950/10 dark:text-slate-700"
                : "bg-white text-slate-500 dark:bg-neutral-950 dark:text-white/45",
            ].join(" ")}
          >
            {t("models_page.owner_model_count", { count: totalModelCount })}
          </span>
        </button>

        <div
          data-testid="owner-sidebar-list"
          className="-mx-1 min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto px-1 py-1"
        >
          {libraryOwners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-neutral-800 dark:text-white/45">
              {t("models_page.no_owner_presets")}
            </div>
          ) : filteredLibraryOwners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-neutral-800 dark:text-white/45">
              {t("models_page.no_owner_search_results")}
            </div>
          ) : (
            filteredLibraryOwners.map((owner) => {
              const count = ownerModelCounts.get(owner.value) ?? owner.modelCount ?? 0;
              const selected = ownerFilter === owner.value;
              return (
                <div
                  key={owner.value}
                  className={[
                    "group/owner relative flex items-center gap-2 overflow-hidden rounded-xl px-2 py-1.5 transition-colors duration-200 ease-out",
                    selected
                      ? "bg-slate-100 ring-1 ring-slate-200 dark:bg-white/[0.08] dark:ring-white/10"
                      : "hover:bg-slate-50 dark:hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => onOwnerFilterChange(owner.value)}
                    className="min-w-0 flex-1 text-left"
                    title={owner.description || owner.value}
                  >
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                      {owner.label || owner.value}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500 dark:text-white/45">
                      {owner.value}
                    </span>
                  </button>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 transition-transform duration-200 ease-out group-focus-within/owner:-translate-x-16 group-hover/owner:-translate-x-16 motion-reduce:transition-none dark:bg-white/[0.08] dark:text-white/45">
                    {t("models_page.owner_model_count", { count })}
                  </span>
                  <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 translate-x-3 items-center gap-1 opacity-0 transition-all duration-200 ease-out group-focus-within/owner:pointer-events-auto group-focus-within/owner:translate-x-0 group-focus-within/owner:opacity-100 group-hover/owner:pointer-events-auto group-hover/owner:translate-x-0 group-hover/owner:opacity-100 motion-reduce:transition-none">
                    <Button
                      size="xs"
                      variant="ghost"
                      className="transition-all duration-200 ease-out"
                      onClick={() => onEditOwner(owner)}
                      aria-label={t("models_page.edit_owner_aria", { owner: owner.label })}
                      title={t("models_page.edit_owner_aria", { owner: owner.label })}
                    >
                      <Edit3 size={13} />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="transition-all duration-200 ease-out"
                      onClick={() => onDeleteOwner(owner)}
                      aria-label={t("models_page.delete_owner_aria", { owner: owner.label })}
                      title={t("models_page.delete_owner_aria", { owner: owner.label })}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
