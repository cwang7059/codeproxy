import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RestrictionMultiSelect } from "@/modules/api-keys/RestrictionMultiSelect";
import {
  initialProfileFormSectionsExpanded,
  type ProfileDraft,
} from "@/modules/api-key-permissions/apiKeyPermissionProfileUtils";
import { TextInput } from "@/modules/ui/Input";
import { ToggleSwitch } from "@/modules/ui/ToggleSwitch";
import type { MultiSelectOption } from "@/modules/ui/MultiSelect";

type ApiKeyPermissionProfileFormProps = {
  draft: ProfileDraft;
  setDraft: Dispatch<SetStateAction<ProfileDraft>>;
  availableModels: MultiSelectOption[];
  availableChannelGroups: MultiSelectOption[];
  filteredAvailableChannels: MultiSelectOption[];
};

function ProfileFormSection({
  sectionId,
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  sectionId: string;
  title: string;
  description?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-slate-200/90 dark:border-neutral-800">
      <button
        type="button"
        data-testid={sectionId}
        aria-expanded={expanded}
        aria-controls={`${sectionId}-panel`}
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">{description}</p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-white/55">
          {expanded
            ? t("api_key_permissions_page.hide_section")
            : t("api_key_permissions_page.show_section")}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {expanded ? (
        <div
          id={`${sectionId}-panel`}
          className="space-y-4 border-t border-slate-100 px-4 py-4 dark:border-neutral-800"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function ApiKeyPermissionProfileForm({
  draft,
  setDraft,
  availableModels,
  availableChannelGroups,
  filteredAvailableChannels,
}: ApiKeyPermissionProfileFormProps) {
  const { t } = useTranslation();
  const [sectionsExpanded, setSectionsExpanded] = useState(() =>
    initialProfileFormSectionsExpanded(draft),
  );

  const toggleSection = (key: keyof typeof sectionsExpanded) => {
    setSectionsExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200/90 px-4 py-4 dark:border-neutral-800">
        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          {t("api_key_permissions_page.form_section_basic")}
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            {t("api_key_permissions_page.form_name")}
          </label>
          <TextInput
            type="text"
            value={draft.name}
            aria-label={t("api_key_permissions_page.form_name")}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={t("api_key_permissions_page.form_name_placeholder")}
          />
        </div>
      </section>

      <ProfileFormSection
        sectionId="permission-profile-section-limits"
        title={t("api_key_permissions_page.form_section_limits")}
        description={t("api_key_permissions_page.form_section_limits_desc")}
        expanded={sectionsExpanded.limits}
        onToggle={() => toggleSection("limits")}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {(
            [
              ["dailyLimit", "form_daily_limit"],
              ["totalQuota", "form_total_quota"],
              ["concurrencyLimit", "form_concurrency_limit"],
              ["rpmLimit", "form_rpm_limit"],
              ["tpmLimit", "form_tpm_limit"],
            ] as const
          ).map(([key, labelKey]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
                {t(`api_key_permissions_page.${labelKey}`)}
              </label>
              <TextInput
                type="number"
                min={0}
                value={draft[key]}
                aria-label={t(`api_key_permissions_page.${labelKey}`)}
                placeholder={t("api_key_permissions_page.form_unlimited_hint")}
                onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
              />
            </div>
          ))}
        </div>
      </ProfileFormSection>

      <ProfileFormSection
        sectionId="permission-profile-section-permissions"
        title={t("api_key_permissions_page.form_section_permissions")}
        description={t("api_key_permissions_page.form_section_permissions_desc")}
        expanded={sectionsExpanded.permissions}
        onToggle={() => toggleSection("permissions")}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            {t("api_keys_page.form_allowed_channel_groups")}
          </label>
          <RestrictionMultiSelect
            options={availableChannelGroups}
            value={draft.allowedChannelGroups}
            onChange={(selected) =>
              setDraft((prev) => ({ ...prev, allowedChannelGroups: selected }))
            }
            placeholder={t("api_keys_page.select_channel_groups")}
            unrestrictedLabel={t("api_keys_page.form_all_channel_groups")}
            selectedCountLabel={(count) =>
              t("api_keys_page.selected_channel_groups_count", { count })
            }
            searchPlaceholder={t("api_keys_page.search_channel_groups")}
            selectFilteredLabel={t("api_keys_page.select_filtered")}
            clearRestrictionLabel={t("api_keys_page.clear_restriction")}
            noResultsLabel={t("api_keys_page.no_results")}
          />
        </div>

        <div>
          <div className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 dark:border-amber-500/25 dark:bg-amber-500/10">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800 dark:text-white/85">
                {t("api_keys_page.form_exact_channels")}
              </div>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-100/75">
                {t("api_keys_page.form_exact_channels_desc")}
              </p>
            </div>
            <ToggleSwitch
              checked={draft.useExactChannelRestrictions}
              ariaLabel={t("api_keys_page.form_exact_channels")}
              onCheckedChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  useExactChannelRestrictions: checked,
                  allowedChannels: checked ? prev.allowedChannels : [],
                }))
              }
            />
          </div>
          {draft.useExactChannelRestrictions ? (
            <>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
                {t("api_keys_page.form_allowed_channels")}
              </label>
              <RestrictionMultiSelect
                options={filteredAvailableChannels}
                value={draft.allowedChannels}
                onChange={(selected) =>
                  setDraft((prev) => ({ ...prev, allowedChannels: selected }))
                }
                placeholder={t("api_keys_page.select_channels")}
                unrestrictedLabel={t("api_keys_page.form_all_channels")}
                selectedCountLabel={(count) => t("api_keys_page.selected_channels_count", { count })}
                searchPlaceholder={t("api_keys_page.search_channels")}
                selectFilteredLabel={t("api_keys_page.select_filtered")}
                clearRestrictionLabel={t("api_keys_page.clear_restriction")}
                noResultsLabel={t("api_keys_page.no_results")}
              />
            </>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            {t("api_keys_page.form_allowed_models")}
          </label>
          <RestrictionMultiSelect
            options={availableModels}
            value={draft.allowedModels}
            onChange={(selected) => setDraft((prev) => ({ ...prev, allowedModels: selected }))}
            placeholder={t("api_keys_page.select_models")}
            unrestrictedLabel={t("api_keys_page.form_all_models")}
            selectedCountLabel={(count) => t("api_keys_page.selected_models_count", { count })}
            searchPlaceholder={t("api_keys_page.search_models")}
            selectFilteredLabel={t("api_keys_page.select_filtered")}
            clearRestrictionLabel={t("api_keys_page.clear_restriction")}
            noResultsLabel={t("api_keys_page.no_results")}
          />
        </div>
      </ProfileFormSection>

      <ProfileFormSection
        sectionId="permission-profile-section-advanced"
        title={t("api_key_permissions_page.form_section_advanced")}
        description={t("api_key_permissions_page.form_section_advanced_desc")}
        expanded={sectionsExpanded.advanced}
        onToggle={() => toggleSection("advanced")}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white/80">
            {t("api_key_permissions_page.form_system_prompt")}
          </label>
          <textarea
            value={draft.systemPrompt}
            aria-label={t("api_key_permissions_page.form_system_prompt")}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, systemPrompt: event.target.value }))
            }
            placeholder={t("api_keys_page.system_prompt_hint")}
            rows={4}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-indigo-500"
          />
        </div>
      </ProfileFormSection>
    </div>
  );
}
