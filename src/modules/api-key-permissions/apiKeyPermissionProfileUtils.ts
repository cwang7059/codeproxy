import {
  makePermissionProfileId,
  type ApiKeyPermissionProfile,
} from "@/lib/http/apis/api-key-permission-profiles";

export type ProfileDraft = {
  id: string;
  name: string;
  dailyLimit: string;
  totalQuota: string;
  concurrencyLimit: string;
  rpmLimit: string;
  tpmLimit: string;
  allowedModels: string[];
  allowedChannels: string[];
  allowedChannelGroups: string[];
  useExactChannelRestrictions: boolean;
  systemPrompt: string;
};

export const emptyProfileDraft = (): ProfileDraft => ({
  id: "",
  name: "",
  dailyLimit: "",
  totalQuota: "",
  concurrencyLimit: "",
  rpmLimit: "",
  tpmLimit: "",
  allowedModels: [],
  allowedChannels: [],
  allowedChannelGroups: [],
  useExactChannelRestrictions: false,
  systemPrompt: "",
});

const limitToText = (value: number | undefined) => (value && value > 0 ? String(value) : "");

const limitFromText = (value: string) => {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const readProfileDraft = (profile: ApiKeyPermissionProfile): ProfileDraft => ({
  id: profile.id,
  name: profile.name,
  dailyLimit: limitToText(profile["daily-limit"]),
  totalQuota: limitToText(profile["total-quota"]),
  concurrencyLimit: limitToText(profile["concurrency-limit"]),
  rpmLimit: limitToText(profile["rpm-limit"]),
  tpmLimit: limitToText(profile["tpm-limit"]),
  allowedModels: [...profile["allowed-models"]],
  allowedChannels: [...profile["allowed-channels"]],
  allowedChannelGroups: [...profile["allowed-channel-groups"]],
  useExactChannelRestrictions: profile["allowed-channels"].length > 0,
  systemPrompt: profile["system-prompt"],
});

export const draftToProfile = (draft: ProfileDraft): ApiKeyPermissionProfile => ({
  id: draft.id || makePermissionProfileId(draft.name),
  name: draft.name.trim(),
  "daily-limit": limitFromText(draft.dailyLimit),
  "total-quota": limitFromText(draft.totalQuota),
  "concurrency-limit": limitFromText(draft.concurrencyLimit),
  "rpm-limit": limitFromText(draft.rpmLimit),
  "tpm-limit": limitFromText(draft.tpmLimit),
  "allowed-channel-groups": draft.allowedChannelGroups,
  "allowed-channels": draft.useExactChannelRestrictions ? draft.allowedChannels : [],
  "allowed-models": draft.allowedModels,
  "system-prompt": draft.systemPrompt.trim(),
});

export const profileDraftHasLimits = (draft: ProfileDraft): boolean =>
  Boolean(
    draft.dailyLimit.trim() ||
      draft.totalQuota.trim() ||
      draft.concurrencyLimit.trim() ||
      draft.rpmLimit.trim() ||
      draft.tpmLimit.trim(),
  );

export const profileDraftHasPermissions = (draft: ProfileDraft): boolean =>
  draft.allowedChannelGroups.length > 0 ||
  draft.allowedModels.length > 0 ||
  draft.useExactChannelRestrictions;

export const initialProfileFormSectionsExpanded = (draft: ProfileDraft) => ({
  limits: profileDraftHasLimits(draft) || !draft.id,
  permissions: profileDraftHasPermissions(draft),
  advanced: Boolean(draft.systemPrompt.trim()),
});
