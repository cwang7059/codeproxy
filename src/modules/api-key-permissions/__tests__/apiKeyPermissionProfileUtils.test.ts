import { describe, expect, test } from "vitest";
import type { ApiKeyPermissionProfile } from "@/lib/http/apis/api-key-permission-profiles";
import {
  draftToProfile,
  emptyProfileDraft,
  initialProfileFormSectionsExpanded,
  profileDraftHasLimits,
  profileDraftHasPermissions,
  readProfileDraft,
} from "@/modules/api-key-permissions/apiKeyPermissionProfileUtils";

describe("apiKeyPermissionProfileUtils", () => {
  test("round-trips profile drafts and derives section defaults", () => {
    const profile: ApiKeyPermissionProfile = {
      id: "standard",
      name: "Standard",
      "daily-limit": 15000,
      "total-quota": 0,
      "concurrency-limit": 0,
      "rpm-limit": 120,
      "tpm-limit": 0,
      "allowed-channel-groups": ["pro"],
      "allowed-channels": ["Claude渠道"],
      "allowed-models": ["gpt-4.1"],
      "system-prompt": "You are helpful.",
    };

    const draft = readProfileDraft(profile);
    expect(draftToProfile(draft)).toEqual(profile);
    expect(profileDraftHasLimits(draft)).toBe(true);
    expect(profileDraftHasPermissions(draft)).toBe(true);
    expect(initialProfileFormSectionsExpanded(draft)).toEqual({
      limits: true,
      permissions: true,
      advanced: true,
    });
  });

  test("defaults new drafts to basic limits section only", () => {
    const draft = emptyProfileDraft();
    expect(profileDraftHasLimits(draft)).toBe(false);
    expect(profileDraftHasPermissions(draft)).toBe(false);
    expect(initialProfileFormSectionsExpanded(draft)).toEqual({
      limits: true,
      permissions: false,
      advanced: false,
    });
  });
});
