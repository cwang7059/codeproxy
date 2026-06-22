import { useMemo, type ReactNode } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import type { ChannelGroupChannelDetail } from "@/lib/http/apis/channel-groups";
import type { RoutingChannelGroupMemberEntry, RoutingPathRouteEntry } from "@/modules/config/visual/types";
import { ChannelDisplayTags } from "@/modules/channel-groups/components/ChannelDisplayTags";
import { RoutingEditorField } from "@/modules/channel-groups/components/RoutingEditorField";
import type { GroupDraft, RoutingModelOption } from "@/modules/channel-groups/routing-config-editor-types";
import {
  normalizeChannelName,
  readChannelDisplayTags,
} from "@/modules/channel-groups/routing-config-editor-utils";
import { VendorIcon } from "@/modules/api-keys/apiKeyPageUtils";
import {
  emptyModelPricing,
  formatModelPrice,
} from "@/modules/models/modelAvailability";
import { Button } from "@/modules/ui/Button";
import { Checkbox } from "@/modules/ui/Checkbox";
import { TextInput } from "@/modules/ui/Input";
import { Modal } from "@/modules/ui/Modal";
import { SearchableCheckboxMultiSelect } from "@/modules/ui/SearchableCheckboxMultiSelect";
import { Select } from "@/modules/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/ui/Tabs";
import { OverflowTooltip } from "@/modules/ui/Tooltip";
import { VirtualTable, type VirtualTableColumn } from "@/modules/ui/VirtualTable";

type ChannelOption = {
  value: string;
  label: ReactNode;
  searchText: string;
};

export type ChannelGroupEditorModalProps = {
  open: boolean;
  groupEditorId: string | null;
  groupDraft: GroupDraft;
  groupEditorTab: "basic" | "models";
  groupDraftError: string;
  disabled?: boolean;
  draftStaleChannels: RoutingChannelGroupMemberEntry[];
  draftStaleChannelIds: Set<string>;
  primaryRoute: RoutingPathRouteEntry;
  selectedChannelValues: string[];
  channelOptions: ChannelOption[];
  modelOptions: RoutingModelOption[];
  modelsLoading: boolean;
  modelsError: string;
  selectedModelSet: Set<string>;
  allVisibleModelsSelected: boolean;
  someVisibleModelsSelected: boolean;
  availableChannelDetails: Record<string, ChannelGroupChannelDetail>;
  onClose: () => void;
  onSave: () => void;
  onTabChange: (tab: "basic" | "models") => void;
  onDraftChange: (patch: Partial<GroupDraft>) => void;
  onUpdatePrimaryRoute: (patch: Partial<RoutingPathRouteEntry>) => void;
  onUpdateDraftChannels: (selectedValues: string[]) => void;
  onUpdateDraftChannel: (channelId: string, patch: Partial<RoutingChannelGroupMemberEntry>) => void;
  onRemoveDraftChannel: (channelId: string) => void;
  onToggleDraftModel: (modelId: string, checked: boolean) => void;
  onSelectAllDraftModels: () => void;
  onClearDraftModels: () => void;
};

export function ChannelGroupEditorModal({
  open,
  groupEditorId,
  groupDraft,
  groupEditorTab,
  groupDraftError,
  disabled,
  draftStaleChannels,
  draftStaleChannelIds,
  primaryRoute,
  selectedChannelValues,
  channelOptions,
  modelOptions,
  modelsLoading,
  modelsError,
  selectedModelSet,
  allVisibleModelsSelected,
  someVisibleModelsSelected,
  availableChannelDetails,
  onClose,
  onSave,
  onTabChange,
  onDraftChange,
  onUpdatePrimaryRoute,
  onUpdateDraftChannels,
  onUpdateDraftChannel,
  onRemoveDraftChannel,
  onToggleDraftModel,
  onSelectAllDraftModels,
  onClearDraftModels,
}: ChannelGroupEditorModalProps) {
  const { t } = useTranslation();
  const compactViewport = useCompactViewport();

  const groupMemberColumns = useMemo<VirtualTableColumn<RoutingChannelGroupMemberEntry>[]>(
    () => [
      {
        key: "channel",
        label: t("channel_groups_page.table_channels"),
        cellClassName: "min-w-0 whitespace-nowrap",
        render: (channel) => (
          <OverflowTooltip content={channel.name} className="block min-w-0">
            <span className="block min-w-0">
              <span
                className={`flex min-w-0 items-center gap-2 truncate text-sm ${
                  draftStaleChannelIds.has(channel.id)
                    ? "text-rose-700 dark:text-rose-200"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                <span className="truncate">{channel.name}</span>
                {draftStaleChannelIds.has(channel.id) ? (
                  <span className="inline-flex shrink-0 items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                    {t("channel_groups_page.deleted_badge")}
                  </span>
                ) : null}
              </span>
              {readChannelDisplayTags(availableChannelDetails[normalizeChannelName(channel.name)])
                .length > 0 ? (
                <span className="mt-1 flex flex-wrap gap-1">
                  <ChannelDisplayTags
                    tags={readChannelDisplayTags(
                      availableChannelDetails[normalizeChannelName(channel.name)],
                    )}
                  />
                </span>
              ) : null}
            </span>
          </OverflowTooltip>
        ),
      },
      {
        key: "priority",
        label: t("channel_groups_page.channel_priority_label"),
        width: "w-[156px] min-w-[156px]",
        cellClassName: "whitespace-nowrap",
        render: (channel) => (
          <TextInput
            value={channel.priority}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (!/^\d*$/.test(value)) return;
              onUpdateDraftChannel(channel.id, { priority: value });
            }}
            placeholder="1"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={disabled}
          />
        ),
      },
      {
        key: "actions",
        label: t("common.action"),
        width: "w-[72px] min-w-[72px]",
        headerClassName: "text-right",
        cellClassName: "whitespace-nowrap text-right",
        render: (channel) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveDraftChannel(channel.id)}
              disabled={disabled}
              aria-label={t("channel_groups_page.remove_channel")}
            >
              <X size={14} />
            </Button>
          </div>
        ),
      },
    ],
    [
      availableChannelDetails,
      disabled,
      draftStaleChannelIds,
      onRemoveDraftChannel,
      onUpdateDraftChannel,
      t,
    ],
  );

  const modelColumns = useMemo<VirtualTableColumn<RoutingModelOption>[]>(
    () => [
      {
        key: "select",
        label: "",
        width: "w-12",
        headerClassName: "text-center",
        cellClassName: "text-center",
        headerRender: () => (
          <Checkbox
            checked={allVisibleModelsSelected}
            indeterminate={someVisibleModelsSelected}
            disabled={disabled || modelOptions.length === 0}
            onCheckedChange={(checked) => {
              if (checked) onSelectAllDraftModels();
              else onClearDraftModels();
            }}
            aria-label={t("channel_groups_page.allowed_models_label")}
          />
        ),
        render: (model) => (
          <Checkbox
            checked={selectedModelSet.has(model.id)}
            onCheckedChange={(checked) => onToggleDraftModel(model.id, checked)}
            disabled={disabled}
            aria-label={model.id}
          />
        ),
      },
      {
        key: "model",
        label: t("models_page.col_model"),
        width: "w-[28rem]",
        cellClassName: "min-w-0",
        render: (model) => (
          <div className="flex min-w-0 items-center gap-2">
            <VendorIcon modelId={model.id} size={16} />
            <div className="min-w-0">
              <OverflowTooltip content={model.id} className="block min-w-0">
                <span className="block min-w-0 truncate font-medium">{model.id}</span>
              </OverflowTooltip>
              {model.description ? (
                <OverflowTooltip content={model.description} className="block min-w-0">
                  <span className="block min-w-0 truncate text-[11px] text-slate-500 dark:text-white/45">
                    {model.description}
                  </span>
                </OverflowTooltip>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: "owner",
        label: t("models_page.col_owner"),
        width: "w-36",
        cellClassName: "min-w-0 whitespace-nowrap text-slate-600 dark:text-white/60",
        render: (model) => model.owned_by || "-",
        overflowTooltip: (model) => model.owned_by || "-",
      },
      {
        key: "price",
        label: t("models_page.col_price"),
        width: "w-56",
        cellClassName:
          "whitespace-nowrap font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200",
        render: (model) =>
          formatModelPrice(model.pricing ?? emptyModelPricing(), t("models_page.not_priced")),
      },
    ],
    [
      allVisibleModelsSelected,
      disabled,
      modelOptions.length,
      onClearDraftModels,
      onSelectAllDraftModels,
      onToggleDraftModel,
      selectedModelSet,
      someVisibleModelsSelected,
      t,
    ],
  );

  return (
    <Modal
      open={open}
      title={
        groupEditorId ? t("channel_groups_page.edit_group") : t("channel_groups_page.add_group")
      }
      description={t("channel_groups_page.group_modal_desc")}
      onClose={onClose}
      maxWidth={compactViewport ? "max-w-[calc(100vw-2rem)]" : "max-w-4xl"}
      bodyTestId="group-editor-modal-body"
      bodyHeightClassName={
        compactViewport
          ? "h-[min(560px,calc(100dvh-6rem))]"
          : "h-[560px] max-h-[calc(100vh-8rem)]"
      }
      bodyOverflowClassName="overflow-hidden"
      bodyClassName="flex flex-col"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {groupDraftError ? (
            <span className="text-sm font-medium text-rose-600 dark:text-rose-300">
              {groupDraftError}
            </span>
          ) : null}
          <Button variant="secondary" onClick={onClose} disabled={disabled}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={disabled || Boolean(groupDraftError)}
          >
            {groupEditorId ? t("common.save") : t("common.add")}
          </Button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        {draftStaleChannels.length > 0 ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <div className="flex items-start gap-3">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t("channel_groups_page.stale_alert_title")}</p>
                <p className="mt-1 text-xs leading-5 text-rose-700/90 dark:text-rose-100/85">
                  {t("channel_groups_page.stale_alert_message", {
                    count: draftStaleChannels.length,
                  })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {draftStaleChannels.map((channel) => (
                    <span
                      key={channel.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-rose-700 dark:border-rose-400/30 dark:bg-neutral-950/50 dark:text-rose-100"
                    >
                      <span>{channel.name}</span>
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                        {t("channel_groups_page.deleted_badge")}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <Tabs value={groupEditorTab} onValueChange={(value) => onTabChange(value as "basic" | "models")}>
          <div data-testid="group-editor-tabs-shell" className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0">
              <TabsList>
                <TabsTrigger value="basic">{t("channel_groups_page.basic_config_tab")}</TabsTrigger>
                <TabsTrigger value="models">{t("channel_groups_page.models_tab")}</TabsTrigger>
              </TabsList>
            </div>

            <div
              data-testid="group-editor-tab-viewport"
              className="mt-4 min-h-0 flex-1 overflow-hidden"
            >
              <TabsContent value="basic" className="h-full min-h-0 overflow-y-auto pr-1 space-y-5">
                <RoutingEditorField
                  label={t("channel_groups_page.routing_strategy_label")}
                  tooltip={t("channel_groups_page.routing_strategy_tooltip")}
                >
                  <Select
                    aria-label={t("channel_groups_page.routing_strategy_label")}
                    value={groupDraft.strategy}
                    disabled={disabled}
                    className="w-full"
                    options={[
                      {
                        value: "round-robin",
                        label: t("channel_groups_page.routing_strategy_round_robin"),
                      },
                      {
                        value: "fill-first",
                        label: t("channel_groups_page.routing_strategy_fill_first"),
                      },
                    ]}
                    onChange={(value) => {
                      onDraftChange({
                        strategy: value === "fill-first" ? "fill-first" : "round-robin",
                      });
                    }}
                  />
                </RoutingEditorField>

                <div className="grid gap-4 lg:grid-cols-2">
                  <RoutingEditorField label={t("channel_groups_page.group_name_label")}>
                    <TextInput
                      value={groupDraft.name}
                      onChange={(event) => onDraftChange({ name: event.currentTarget.value })}
                      placeholder="pro"
                      disabled={disabled}
                    />
                  </RoutingEditorField>
                  <RoutingEditorField label={t("channel_groups_page.description_label")}>
                    <TextInput
                      value={groupDraft.description}
                      onChange={(event) =>
                        onDraftChange({ description: event.currentTarget.value })
                      }
                      placeholder={t("channel_groups_page.description_placeholder")}
                      disabled={disabled}
                    />
                  </RoutingEditorField>
                </div>

                <div className="grid gap-4 md:grid-cols-1">
                  <RoutingEditorField
                    label={t("channel_groups_page.route_path_label")}
                    hint={t("channel_groups_page.route_path_hint")}
                  >
                    <TextInput
                      value={primaryRoute.path}
                      onChange={(event) => onUpdatePrimaryRoute({ path: event.currentTarget.value })}
                      placeholder="/pro"
                      disabled={disabled}
                    />
                  </RoutingEditorField>
                </div>

                <div className="space-y-3">
                  <RoutingEditorField
                    label={t("channel_groups_page.select_channel_label")}
                    hint={t("channel_groups_page.select_channel_hint")}
                  >
                    <SearchableCheckboxMultiSelect
                      value={selectedChannelValues}
                      onChange={onUpdateDraftChannels}
                      options={channelOptions}
                      placeholder={t("channel_groups_page.select_channel_placeholder")}
                      searchPlaceholder={t("channel_groups_page.search_channel_placeholder")}
                      selectFilteredLabel={t("channel_groups_page.select_filtered_channels")}
                      deselectFilteredLabel={t("channel_groups_page.deselect_filtered_channels")}
                      selectedCountLabel={(count) =>
                        t("channel_groups_page.selected_channels_count", { count })
                      }
                      noResultsLabel={t("channel_groups_page.no_search_results")}
                      aria-label={t("channel_groups_page.select_channel_label")}
                      disabled={disabled}
                    />
                  </RoutingEditorField>
                </div>

                <VirtualTable<RoutingChannelGroupMemberEntry>
                  rows={groupDraft.channels}
                  columns={groupMemberColumns}
                  rowKey={(channel) => channel.id}
                  virtualize={false}
                  rowHeight={52}
                  height="h-auto"
                  minHeight="min-h-0"
                  minWidth="min-w-[640px]"
                  caption={t("channel_groups_page.select_channel_label")}
                  emptyText={t("channel_groups_page.empty_group_channels")}
                  rowClassName={(channel) =>
                    draftStaleChannelIds.has(channel.id)
                      ? "bg-rose-50/70 dark:bg-rose-500/10"
                      : ""
                  }
                  naturalFlow
                />
              </TabsContent>

              <TabsContent
                value="models"
                className="flex h-full min-h-0 flex-col gap-3 overflow-hidden"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t("channel_groups_page.allowed_models_label")}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-white/55">
                      {t("channel_groups_page.allowed_models_hint")}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onSelectAllDraftModels}
                      disabled={disabled || modelOptions.length === 0}
                    >
                      <Check size={14} />
                      {t("channel_groups_page.select_all_models")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onClearDraftModels}
                      disabled={disabled || groupDraft.allowedModels.length === 0}
                    >
                      <X size={14} />
                      {t("channel_groups_page.clear_models")}
                    </Button>
                  </div>
                </div>

                {selectedChannelValues.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-white/55">
                    {t("channel_groups_page.models_need_channels")}
                  </div>
                ) : modelsError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
                    {modelsError}
                  </div>
                ) : (
                  <div
                    data-testid="group-editor-model-list"
                    className="min-h-0 flex-1 overflow-hidden"
                  >
                    <VirtualTable<RoutingModelOption>
                      rows={modelOptions}
                      columns={modelColumns}
                      rowKey={(model) => model.id}
                      loading={modelsLoading}
                      virtualize={false}
                      rowHeight={58}
                      height="h-full"
                      minHeight={compactViewport ? "min-h-[220px]" : "min-h-[360px]"}
                      minWidth="min-w-[760px]"
                      caption={t("channel_groups_page.allowed_models_label")}
                      emptyText={t("channel_groups_page.no_channel_models")}
                      showAllLoadedMessage={false}
                    />
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </Modal>
  );
}
