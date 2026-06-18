import { describe, expect, test } from "vitest";
import {
  computeApiKeyPageStats,
  filterApiKeyEntries,
} from "@/modules/api-keys/api-keys-page-utils";
import type { ApiKeyEntry } from "@/lib/http/apis/api-keys";

const sampleEntries: ApiKeyEntry[] = [
  { key: "sk-active", name: "Active Key" },
  { key: "sk-disabled", name: "Disabled Key", disabled: true },
  {
    key: "sk-limited",
    name: "Limited Key",
    "rpm-limit": 100,
  },
];

describe("api-keys-page-utils", () => {
  test("computeApiKeyPageStats summarizes entries", () => {
    expect(computeApiKeyPageStats(sampleEntries)).toEqual({
      total: 3,
      active: 2,
      disabled: 1,
      restricted: 1,
    });
  });

  test("filterApiKeyEntries supports search and status filters", () => {
    expect(filterApiKeyEntries(sampleEntries, "limited", "")).toHaveLength(1);
    expect(filterApiKeyEntries(sampleEntries, "", "disabled")).toHaveLength(1);
    expect(filterApiKeyEntries(sampleEntries, "active", "active")).toHaveLength(1);
  });
});
