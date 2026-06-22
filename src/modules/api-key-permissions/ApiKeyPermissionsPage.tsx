import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { apiKeyEntriesApi, type ApiKeyEntry } from "@/lib/http/apis/api-keys";
import {
  applyApiKeyPermissionProfile,
  apiKeyPermissionProfilesApi,
  type ApiKeyPermissionProfile,
} from "@/lib/http/apis/api-key-permission-profiles";
import { useApiKeyPermissionOptions } from "@/modules/api-keys/hooks/useApiKeyPermissionOptions";
import {
  draftToProfile,
  emptyProfileDraft,
  readProfileDraft,
  type ProfileDraft,
} from "@/modules/api-key-permissions/apiKeyPermissionProfileUtils";
import { ApiKeyPermissionProfileForm } from "@/modules/api-key-permissions/components/ApiKeyPermissionProfileForm";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { ConfirmModal } from "@/modules/ui/ConfirmModal";
import { EmptyState } from "@/modules/ui/EmptyState";
import { Modal } from "@/modules/ui/Modal";
import { PageToolbar } from "@/modules/ui/PageToolbar";
import { useToast } from "@/modules/ui/ToastProvider";
import { VirtualTable, type VirtualTableColumn } from "@/modules/ui/VirtualTable";

const formatLimit = (value: number, unlimited: string) =>
  value > 0 ? value.toLocaleString() : unlimited;

const boundProfileCount = (profile: ApiKeyPermissionProfile, entries: ApiKeyEntry[]) =>
  entries.filter((entry) => entry["permission-profile-id"] === profile.id).length;

export function ApiKeyPermissionsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [profiles, setProfiles] = useState<ApiKeyPermissionProfile[]>([]);
  const [entries, setEntries] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(() => emptyProfileDraft());
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyPermissionProfile | null>(null);
  const {
    availableModels,
    availableChannels,
    availableChannelGroups,
    channelRouteGroupsByName,
    loadModels,
    refreshPermissionOptions,
  } = useApiKeyPermissionOptions();

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const [nextProfiles, nextEntries] = await Promise.all([
        apiKeyPermissionProfilesApi.list(),
        apiKeyEntriesApi.list().catch(() => [] as ApiKeyEntry[]),
        refreshPermissionOptions(),
      ]);
      setProfiles(nextProfiles);
      setEntries(nextEntries);
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_key_permissions_page.load_failed"),
      });
    } finally {
      setLoading(false);
    }
  }, [notify, refreshPermissionOptions, t]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    void loadModels(
      draft.useExactChannelRestrictions ? draft.allowedChannels : [],
      draft.allowedChannelGroups,
    );
  }, [
    draft.allowedChannelGroups,
    draft.allowedChannels,
    draft.useExactChannelRestrictions,
    loadModels,
  ]);

  const filteredAvailableChannels = useMemo(() => {
    if (!draft.useExactChannelRestrictions || draft.allowedChannelGroups.length === 0) {
      return availableChannels;
    }
    const allowedGroups = new Set(draft.allowedChannelGroups.map((group) => group.toLowerCase()));
    return availableChannels.filter((option) => {
      const groups = channelRouteGroupsByName[option.value] ?? [];
      return groups.some((group) => allowedGroups.has(group));
    });
  }, [
    availableChannels,
    channelRouteGroupsByName,
    draft.allowedChannelGroups,
    draft.useExactChannelRestrictions,
  ]);

  useEffect(() => {
    if (!draft.useExactChannelRestrictions || draft.allowedChannelGroups.length === 0) return;
    if (filteredAvailableChannels.length === 0) return;
    const allowedChannelSet = new Set(filteredAvailableChannels.map((option) => option.value));
    setDraft((prev) => {
      const allowedChannels = prev.allowedChannels.filter((channel) =>
        allowedChannelSet.has(channel),
      );
      return allowedChannels.length === prev.allowedChannels.length
        ? prev
        : { ...prev, allowedChannels };
    });
  }, [
    draft.allowedChannelGroups.length,
    draft.useExactChannelRestrictions,
    filteredAvailableChannels,
  ]);

  const openCreateModal = () => {
    setDraft(emptyProfileDraft());
    setModalOpen(true);
  };

  const openEditModal = (profile: ApiKeyPermissionProfile) => {
    setDraft(readProfileDraft(profile));
    setModalOpen(true);
  };

  const handleSaveProfile = async () => {
    const profile = draftToProfile(draft);
    if (!profile.name) {
      notify({ type: "error", message: t("api_key_permissions_page.name_required") });
      return;
    }

    setSaving(true);
    try {
      const isEdit = profiles.some((item) => item.id === profile.id);
      const nextProfiles = isEdit
        ? profiles.map((item) => (item.id === profile.id ? profile : item))
        : [...profiles, profile];
      await apiKeyPermissionProfilesApi.replace(nextProfiles);

      let nextEntries = entries;
      if (isEdit) {
        nextEntries = entries.map((entry) =>
          entry["permission-profile-id"] === profile.id
            ? applyApiKeyPermissionProfile(entry, profile)
            : entry,
        );
        if (JSON.stringify(nextEntries) !== JSON.stringify(entries)) {
          await apiKeyEntriesApi.replace(nextEntries);
        }
      }

      setProfiles(nextProfiles);
      setEntries(nextEntries);
      setModalOpen(false);
      notify({ type: "success", message: t("api_key_permissions_page.profile_saved") });
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_key_permissions_page.save_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const nextProfiles = profiles.filter((profile) => profile.id !== deleteTarget.id);
      await apiKeyPermissionProfilesApi.replace(nextProfiles);
      const nextEntries = entries.map((entry) =>
        entry["permission-profile-id"] === deleteTarget.id
          ? { ...entry, "permission-profile-id": "" }
          : entry,
      );
      if (JSON.stringify(nextEntries) !== JSON.stringify(entries)) {
        await apiKeyEntriesApi.replace(nextEntries);
      }
      setProfiles(nextProfiles);
      setEntries(nextEntries);
      setDeleteTarget(null);
      notify({ type: "success", message: t("api_key_permissions_page.profile_deleted") });
    } catch (err: unknown) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : t("api_key_permissions_page.delete_failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<VirtualTableColumn<ApiKeyPermissionProfile>[]>(
    () => [
      {
        key: "name",
        label: t("api_key_permissions_page.col_name"),
        width: "w-[180px] min-w-[180px]",
        cellClassName: "font-medium text-slate-900 dark:text-white",
        render: (profile) => profile.name,
      },
      {
        key: "limits",
        label: t("api_key_permissions_page.col_limits"),
        width: "w-[220px] min-w-[220px]",
        render: (profile) => (
          <div className="space-y-1 text-xs text-slate-600 dark:text-white/60">
            <div>
              {t("api_key_permissions_page.limit_daily", {
                value: formatLimit(profile["daily-limit"], t("api_keys_page.unlimited")),
              })}
            </div>
            <div>
              {t("api_key_permissions_page.limit_total", {
                value: formatLimit(profile["total-quota"], t("api_keys_page.unlimited")),
              })}
            </div>
            <div>
              {t("api_key_permissions_page.limit_rpm_tpm", {
                rpm: formatLimit(profile["rpm-limit"], t("api_keys_page.unlimited")),
                tpm: formatLimit(profile["tpm-limit"], t("api_keys_page.unlimited")),
              })}
            </div>
          </div>
        ),
      },
      {
        key: "permissions",
        label: t("api_key_permissions_page.col_permissions"),
        width: "w-[220px] min-w-[220px]",
        render: (profile) =>
          t("api_key_permissions_page.permission_summary", {
            groups: profile["allowed-channel-groups"].length,
            channels: profile["allowed-channels"].length,
            models: profile["allowed-models"].length,
          }),
      },
      {
        key: "prompt",
        label: t("api_key_permissions_page.col_system_prompt"),
        width: "w-[260px] min-w-[260px]",
        cellClassName: "min-w-0 text-slate-600 dark:text-white/60",
        render: (profile) =>
          profile["system-prompt"] ? (
            <span className="block truncate">{profile["system-prompt"]}</span>
          ) : (
            <span className="text-slate-400 dark:text-white/40">
              {t("api_key_permissions_page.no_system_prompt")}
            </span>
          ),
      },
      {
        key: "bound",
        label: t("api_key_permissions_page.col_bound_keys"),
        width: "w-[120px] min-w-[120px]",
        render: (profile) =>
          t("api_key_permissions_page.bound_count", {
            count: boundProfileCount(profile, entries),
          }),
      },
      {
        key: "actions",
        label: t("api_key_permissions_page.col_actions"),
        width: "w-[120px] min-w-[120px]",
        render: (profile) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => openEditModal(profile)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-amber-600 dark:text-white/50 dark:hover:bg-neutral-800 dark:hover:text-amber-400"
              aria-label={t("common.edit")}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(profile)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-white/50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              aria-label={t("common.delete")}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ],
    [entries, t],
  );

  const formInstanceKey = modalOpen ? draft.id || "new" : "closed";

  return (
    <section className="page-stack">
      <Card padding="none" loading={loading}>
        <div className="px-5 pt-5 pb-4">
          <PageToolbar
            title={t("api_key_permissions_page.title")}
            description={t("api_key_permissions_page.description")}
            actions={
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadPage()}
                  disabled={loading}
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  {t("api_key_permissions_page.refresh")}
                </Button>
                <Button variant="primary" size="sm" onClick={openCreateModal}>
                  <Plus size={14} />
                  {t("api_key_permissions_page.create")}
                </Button>
              </div>
            }
          />
        </div>
        <div className="px-5 pb-5">
        {profiles.length === 0 ? (
          <EmptyState
            title={t("api_key_permissions_page.empty_title")}
            description={t("api_key_permissions_page.empty_desc")}
            icon={<ShieldCheck size={32} />}
          />
        ) : (
          <VirtualTable<ApiKeyPermissionProfile>
            rows={profiles}
            columns={columns}
            rowKey={(profile) => profile.id}
            loading={loading}
            virtualize={false}
            minWidth="min-w-[1120px]"
            height="h-auto max-h-[calc(100dvh-280px)]"
            emptyText={t("api_key_permissions_page.empty_title")}
            caption={t("api_key_permissions_page.table_caption")}
            showAllLoadedMessage={false}
          />
        )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title={
          draft.id
            ? t("api_key_permissions_page.edit_config")
            : t("api_key_permissions_page.create_config")
        }
        description={t("api_key_permissions_page.config_modal_desc")}
        onClose={() => setModalOpen(false)}
        maxWidth="max-w-4xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={() => void handleSaveProfile()} disabled={saving}>
              {saving
                ? t("api_key_permissions_page.saving")
                : t("api_key_permissions_page.save_config")}
            </Button>
          </>
        }
      >
        <ApiKeyPermissionProfileForm
          key={formInstanceKey}
          draft={draft}
          setDraft={setDraft}
          availableModels={availableModels}
          availableChannelGroups={availableChannelGroups}
          filteredAvailableChannels={filteredAvailableChannels}
        />
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        title={t("api_key_permissions_page.delete_title")}
        description={t("api_key_permissions_page.delete_desc", {
          name: deleteTarget?.name ?? "",
        })}
        confirmText={t("common.delete")}
        busy={saving}
        onConfirm={() => void handleDeleteProfile()}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  );
}
