import { hasModelPricing, type ModelPricing } from "@/modules/models/modelAvailability";

export type ModelStatusFilter = "" | "priced" | "unpriced" | "disabled";

export type ModelPageStats = {
  total: number;
  enabled: number;
  priced: number;
  unpriced: number;
};

type ModelLike = {
  enabled: boolean;
  pricing: ModelPricing;
};

export function computeModelPageStats(models: ModelLike[]): ModelPageStats {
  let enabled = 0;
  let priced = 0;

  for (const model of models) {
    if (model.enabled) enabled += 1;
    if (hasModelPricing(model.pricing)) priced += 1;
  }

  return {
    total: models.length,
    enabled,
    priced,
    unpriced: models.length - priced,
  };
}

export function filterModelItems<
  T extends {
    id: string;
    owned_by: string;
    description: string;
    enabled: boolean;
    pricing: ModelPricing;
  },
>(models: T[], search: string, statusFilter: ModelStatusFilter): T[] {
  const query = search.trim().toLowerCase();

  return models.filter((model) => {
    const isPriced = hasModelPricing(model.pricing);
    if (statusFilter === "priced" && !isPriced) return false;
    if (statusFilter === "unpriced" && isPriced) return false;
    if (statusFilter === "disabled" && model.enabled) return false;
    if (!query) return true;

    const haystack = `${model.id} ${model.owned_by} ${model.description}`.toLowerCase();
    return haystack.includes(query);
  });
}
