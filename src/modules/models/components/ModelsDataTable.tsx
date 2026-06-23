import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, Cpu, Edit3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/modules/ui/Button";
import { Checkbox } from "@/modules/ui/Checkbox";
import { EmptyState } from "@/modules/ui/EmptyState";
import { OverflowTooltip } from "@/modules/ui/Tooltip";
import { VirtualTable, type VirtualTableColumn } from "@/modules/ui/VirtualTable";
import {
  formatPrice,
  hasPricing,
  VendorIcon,
  type ModelItem,
} from "@/modules/models/models-page-helpers";

export type ModelsDataTableProps = {
  models: ModelItem[];
  filteredModels: ModelItem[];
  loading: boolean;
  hasActiveFilters: boolean;
  canDeleteModels: boolean;
  readOnly?: boolean;
  tableViewportHeight: number;
  filteredModelIds: string[];
  selectedModelIds: Set<string>;
  allVisibleModelsSelected: boolean;
  someVisibleModelsSelected: boolean;
  onAddModel: () => void;
  onEditModel: (modelId: string) => void;
  onDeleteModel: (model: ModelItem) => void;
  onToggleModelSelection: (modelId: string, checked: boolean) => void;
  onToggleVisibleModelSelection: (checked: boolean) => void;
};

export function ModelsDataTable({
  models,
  filteredModels,
  loading,
  hasActiveFilters,
  canDeleteModels,
  readOnly = false,
  tableViewportHeight,
  filteredModelIds,
  selectedModelIds,
  allVisibleModelsSelected,
  someVisibleModelsSelected,
  onAddModel,
  onEditModel,
  onDeleteModel,
  onToggleModelSelection,
  onToggleVisibleModelSelection,
}: ModelsDataTableProps) {
  const { t } = useTranslation();

  const modelColumns = useMemo<VirtualTableColumn<ModelItem>[]>(
    () => [
      ...(canDeleteModels
        ? [
            {
              key: "select",
              label: "",
              width: "w-12",
              headerClassName: "text-center",
              cellClassName: "text-center",
              headerRender: () => (
                <Checkbox
                  aria-label={t("models_page.select_all_visible_models")}
                  checked={allVisibleModelsSelected}
                  indeterminate={someVisibleModelsSelected && !allVisibleModelsSelected}
                  disabled={filteredModelIds.length === 0}
                  onCheckedChange={onToggleVisibleModelSelection}
                />
              ),
              render: (row) => (
                <Checkbox
                  aria-label={t("models_page.select_model_aria", { model: row.id })}
                  checked={selectedModelIds.has(row.id)}
                  onCheckedChange={(checked) => onToggleModelSelection(row.id, checked)}
                />
              ),
            } satisfies VirtualTableColumn<ModelItem>,
          ]
        : []),
      {
        key: "model",
        label: t("models_page.col_model"),
        width: "w-[240px] min-w-[240px]",
        cellClassName: "min-w-0",
        render: (row) => (
          <div className="flex min-w-0 items-center gap-2">
            <VendorIcon modelId={row.id} size={16} />
            <OverflowTooltip
              content={row.description ? `${row.id}\n${row.description}` : row.id}
              className="block min-w-0"
            >
              <span className="block min-w-0 truncate font-medium">{row.id}</span>
            </OverflowTooltip>
          </div>
        ),
      },
      {
        key: "owner",
        label: t("models_page.col_owner"),
        width: "w-32",
        render: (row) => row.owned_by || "-",
      },
      {
        key: "mode",
        label: t("models_page.col_pricing_mode"),
        width: "w-36",
        render: (row) =>
          row.pricing.mode === "call" ? t("models_page.mode_call") : t("models_page.mode_token"),
      },
      {
        key: "price",
        label: t("models_page.col_price"),
        width: "w-52",
        cellClassName: "font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200",
        render: (row) => formatPrice(row, t("models_page.not_priced")),
      },
      {
        key: "status",
        label: t("models_page.col_status"),
        width: "w-32",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => {
          const priced = hasPricing(row);
          return (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                row.enabled && priced
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-white/40",
              ].join(" ")}
            >
              {row.enabled && priced ? <Check size={10} /> : null}
              {row.enabled
                ? priced
                  ? t("models_page.priced")
                  : t("models_page.not_priced")
                : t("models_page.disabled")}
            </span>
          );
        },
      },
      ...(readOnly
        ? []
        : [
            {
              key: "actions",
              label: t("models_page.col_actions"),
              width: "w-24",
              render: (row: ModelItem) => (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onEditModel(row.id)}
                    aria-label={t("models_page.edit_model_aria", { model: row.id })}
                    title={t("models_page.edit_model_aria", { model: row.id })}
                  >
                    <Edit3 size={14} />
                  </Button>
                  {canDeleteModels ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onDeleteModel(row)}
                      aria-label={t("models_page.delete_model_aria", { model: row.id })}
                      title={t("models_page.delete_model_aria", { model: row.id })}
                    >
                      <Trash2 size={14} />
                    </Button>
                  ) : null}
                </div>
              ),
            } satisfies VirtualTableColumn<ModelItem>,
          ]),
    ],
    [
      allVisibleModelsSelected,
      canDeleteModels,
      filteredModelIds.length,
      onDeleteModel,
      onEditModel,
      onToggleModelSelection,
      onToggleVisibleModelSelection,
      readOnly,
      selectedModelIds,
      someVisibleModelsSelected,
      t,
    ],
  );

  return (
    <div className="relative overflow-x-auto rounded-xl" style={{ height: tableViewportHeight }}>
      {!loading && models.length === 0 ? (
        <EmptyState
          title={t("models_page.no_model_data")}
          description={t("models_page.empty_models_desc")}
          icon={<Cpu size={32} className="text-slate-400" />}
          action={
            readOnly ? undefined : (
              <Button variant="primary" size="sm" onClick={onAddModel} disabled={loading}>
                <Plus size={14} aria-hidden="true" />
                {t("models_page.add_model")}
              </Button>
            )
          }
        />
      ) : (
        <VirtualTable<ModelItem>
          rows={filteredModels}
          columns={modelColumns}
          rowKey={(row) => row.id}
          loading={loading}
          rowHeight={44}
          height="h-full"
          minHeight="min-h-full"
          caption={t("models_page.table_caption")}
          emptyText={
            hasActiveFilters
              ? t("models_page.empty_models_filtered")
              : t("models_page.no_model_data")
          }
          minWidth="min-w-[980px]"
          stretch={false}
          showAllLoadedMessage={false}
        />
      )}
    </div>
  );
}

export function ModelsTableFooter({
  models,
  filteredModels,
}: {
  models: ModelItem[];
  filteredModels: ModelItem[];
}) {
  const { t } = useTranslation();

  if (models.length === 0) return null;

  return (
    <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-neutral-800/60 dark:text-white/45">
      {t("models_page.showing_models", {
        visible: filteredModels.length.toLocaleString(),
        total: models.length.toLocaleString(),
      })}
    </div>
  );
}
