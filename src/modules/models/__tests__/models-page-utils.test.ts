import { describe, expect, test } from "vitest";
import { emptyModelPricing } from "@/modules/models/modelAvailability";
import {
  computeModelPageStats,
  filterModelItems,
} from "@/modules/models/models-page-utils";

const sampleModels = [
  {
    id: "gpt-5",
    owned_by: "openai",
    description: "Priced model",
    enabled: true,
    pricing: {
      ...emptyModelPricing(),
      inputPricePerMillion: 1.25,
      outputPricePerMillion: 10,
    },
  },
  {
    id: "gpt-draft",
    owned_by: "openai",
    description: "Unpriced model",
    enabled: true,
    pricing: emptyModelPricing(),
  },
  {
    id: "legacy-model",
    owned_by: "openai",
    description: "Disabled model",
    enabled: false,
    pricing: emptyModelPricing(),
  },
];

describe("models-page-utils", () => {
  test("computeModelPageStats summarizes models", () => {
    expect(computeModelPageStats(sampleModels)).toEqual({
      total: 3,
      enabled: 2,
      priced: 1,
      unpriced: 2,
    });
  });

  test("filterModelItems supports search and status filters", () => {
    expect(filterModelItems(sampleModels, "draft", "")).toHaveLength(1);
    expect(filterModelItems(sampleModels, "", "priced")).toHaveLength(1);
    expect(filterModelItems(sampleModels, "", "disabled")).toHaveLength(1);
    expect(filterModelItems(sampleModels, "gpt", "unpriced")).toHaveLength(1);
  });
});
