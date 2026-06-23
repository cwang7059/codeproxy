import iconClaude from "@/assets/icons/claude.svg";
import iconCodex from "@/assets/icons/codex.svg";
import iconDeepseek from "@/assets/icons/deepseek.svg";
import iconGemini from "@/assets/icons/gemini.svg";
import iconGlm from "@/assets/icons/glm.svg";
import iconGrok from "@/assets/icons/grok.svg";
import iconIflow from "@/assets/icons/iflow.svg";
import iconKimiDark from "@/assets/icons/kimi-dark.svg";
import iconKimiLight from "@/assets/icons/kimi-light.svg";
import iconKiro from "@/assets/icons/kiro.svg";
import iconMinimax from "@/assets/icons/minimax.svg";
import iconOpenai from "@/assets/icons/openai.svg";
import iconQwen from "@/assets/icons/qwen.svg";
import iconVertex from "@/assets/icons/vertex.svg";
import { apiClient } from "@/lib/http/client";
import {
  emptyModelPricing,
  filterByConfiguredModelAvailability,
  formatModelPrice,
  hasModelPricing,
  type ConfiguredModelAvailability,
  type ModelAvailabilityItem,
  type ModelConfigMetadataItem,
  type ModelPricing,
  type ModelPricingMode,
  normalizeModelConfigMetadataRows,
} from "@/modules/models/modelAvailability";

export type ModelScope = "active" | "library";
export type ModelPageTab = ModelScope;

export interface ModelItem {
  id: string;
  owned_by: string;
  description: string;
  enabled: boolean;
  source: string;
  pricing: ModelPricing;
}

export interface ModelOwnerPreset {
  value: string;
  label: string;
  description: string;
  enabled: boolean;
  modelCount?: number;
}

export interface ModelFormState {
  originalId: string | null;
  id: string;
  ownedBy: string;
  description: string;
  enabled: boolean;
  mode: ModelPricingMode;
  inputPrice: string;
  outputPrice: string;
  cachedPrice: string;
  pricePerCall: string;
}

export interface OwnerFormState {
  originalValue: string | null;
  value: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface OpenRouterModelSyncState {
  enabled: boolean;
  intervalMinutes: number;
  lastSyncAt: string;
  lastSuccessAt: string;
  lastError: string;
  lastSeen: number;
  lastAdded: number;
  lastUpdated: number;
  lastSkipped: number;
  running: boolean;
}

export interface OpenRouterModelSyncResult {
  seen: number;
  added: number;
  updated: number;
  skipped: number;
}

const VENDOR_ICONS: Record<string, { light: string; dark: string }> = {
  claude: { light: iconClaude, dark: iconClaude },
  codex: { light: iconCodex, dark: iconCodex },
  deepseek: { light: iconDeepseek, dark: iconDeepseek },
  gemini: { light: iconGemini, dark: iconGemini },
  glm: { light: iconGlm, dark: iconGlm },
  gpt: { light: iconOpenai, dark: iconOpenai },
  grok: { light: iconGrok, dark: iconGrok },
  iflow: { light: iconIflow, dark: iconIflow },
  kiro: { light: iconKiro, dark: iconKiro },
  kimi: { light: iconKimiLight, dark: iconKimiDark },
  minimax: { light: iconMinimax, dark: iconMinimax },
  o1: { light: iconOpenai, dark: iconOpenai },
  o3: { light: iconOpenai, dark: iconOpenai },
  o4: { light: iconOpenai, dark: iconOpenai },
  qwen: { light: iconQwen, dark: iconQwen },
  vertex: { light: iconVertex, dark: iconVertex },
};

export const emptyForm: ModelFormState = {
  originalId: null,
  id: "",
  ownedBy: "",
  description: "",
  enabled: true,
  mode: "token",
  inputPrice: "",
  outputPrice: "",
  cachedPrice: "",
  pricePerCall: "",
};

export const emptyOwnerForm: OwnerFormState = {
  originalValue: null,
  value: "",
  label: "",
  description: "",
  enabled: true,
};

export const defaultOpenRouterSyncState: OpenRouterModelSyncState = {
  enabled: false,
  intervalMinutes: 1440,
  lastSyncAt: "",
  lastSuccessAt: "",
  lastError: "",
  lastSeen: 0,
  lastAdded: 0,
  lastUpdated: 0,
  lastSkipped: 0,
  running: false,
};

function getVendorPrefix(modelId: string): string {
  const lower = modelId.toLowerCase();
  for (const prefix of Object.keys(VENDOR_ICONS)) {
    if (lower.startsWith(prefix)) return prefix;
  }
  return "";
}

export function VendorIcon({ modelId, size = 14 }: { modelId: string; size?: number }) {
  const prefix = getVendorPrefix(modelId);
  const icons = prefix ? VENDOR_ICONS[prefix] : null;
  if (!icons) return null;
  return (
    <>
      <img src={icons.light} alt="" width={size} height={size} className="dark:hidden" />
      <img src={icons.dark} alt="" width={size} height={size} className="hidden dark:block" />
    </>
  );
}

function parsePriceInput(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function asNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

function metadataToModel(item: ModelConfigMetadataItem): ModelItem {
  return {
    id: item.id,
    owned_by: item.owned_by,
    description: item.description,
    enabled: item.enabled,
    source: item.source,
    pricing: item.pricing,
  };
}

function normalizeModelConfigResponse(payload: unknown): ModelItem[] {
  return normalizeModelConfigMetadataRows(payload).map(metadataToModel);
}

function normalizeOwnerPreset(raw: Record<string, unknown>): ModelOwnerPreset | null {
  const value = normalizeOwnerValue(String(raw.value ?? raw.id ?? raw.owner ?? "")).trim();
  if (!value) return null;
  return {
    value,
    label: String(raw.label ?? raw.name ?? value).trim() || value,
    description: String(raw.description ?? ""),
    enabled: raw.enabled === false ? false : true,
    modelCount: asNumber(raw.model_count ?? raw.modelCount),
  };
}

export function normalizeOwnerPresetResponse(payload: unknown): ModelOwnerPreset[] {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawList = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(payload)
        ? payload
        : [];

  return rawList
    .map((item) =>
      item && typeof item === "object"
        ? normalizeOwnerPreset(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is ModelOwnerPreset => Boolean(item))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchModelConfigs(scope: ModelScope): Promise<ModelItem[]> {
  try {
    return normalizeModelConfigResponse(await apiClient.get(`/model-configs?scope=${scope}`));
  } catch (error) {
    const legacyPayload = await apiClient.get("/models");
    const legacyModels = normalizeModelConfigResponse(legacyPayload);
    if (legacyModels.length > 0) return legacyModels;
    throw error;
  }
}

export async function fetchOwnerPresets(): Promise<ModelOwnerPreset[]> {
  try {
    return normalizeOwnerPresetResponse(await apiClient.get("/model-owner-presets"));
  } catch {
    return [];
  }
}

function availabilityItemToModel(item: ModelAvailabilityItem): ModelItem {
  return {
    id: item.id,
    owned_by: item.owned_by ?? "",
    description: item.description ?? "",
    enabled: true,
    source: item.source ?? "configured",
    pricing: item.pricing ?? emptyModelPricing(),
  };
}

export function mergeConfiguredModelAvailability(
  data: ModelItem[],
  availability: ConfiguredModelAvailability | null,
): ModelItem[] {
  if (!availability?.scoped) return data;
  const visible = filterByConfiguredModelAvailability(data, availability);
  const seen = new Set(visible.map((model) => model.id.toLowerCase()));
  for (const item of availability.items) {
    const key = item.id.toLowerCase();
    if (seen.has(key)) continue;
    visible.push(availabilityItemToModel(item));
    seen.add(key);
  }
  return visible.sort((a, b) => a.id.localeCompare(b.id));
}

export function toFormState(model: ModelItem): ModelFormState {
  return {
    originalId: model.id,
    id: model.id,
    ownedBy: normalizeOwnerValue(model.owned_by),
    description: model.description,
    enabled: model.enabled,
    mode: model.pricing.mode,
    inputPrice: model.pricing.inputPricePerMillion
      ? model.pricing.inputPricePerMillion.toString()
      : "",
    outputPrice: model.pricing.outputPricePerMillion
      ? model.pricing.outputPricePerMillion.toString()
      : "",
    cachedPrice: model.pricing.cachedPricePerMillion
      ? model.pricing.cachedPricePerMillion.toString()
      : "",
    pricePerCall: model.pricing.pricePerCall ? model.pricing.pricePerCall.toString() : "",
  };
}

function buildModelPayload(form: ModelFormState) {
  const base = {
    id: form.id.trim(),
    owned_by: form.ownedBy.trim(),
    description: form.description.trim(),
    enabled: form.enabled,
  };

  if (form.mode === "call") {
    return {
      ...base,
      pricing: {
        mode: "call" as const,
        price_per_call: parsePriceInput(form.pricePerCall),
      },
    };
  }

  return {
    ...base,
    pricing: {
      mode: "token" as const,
      input_price_per_million: parsePriceInput(form.inputPrice),
      output_price_per_million: parsePriceInput(form.outputPrice),
      cached_price_per_million: parsePriceInput(form.cachedPrice),
    },
  };
}

function payloadToModel(payload: ReturnType<typeof buildModelPayload>, source: string): ModelItem {
  const pricing =
    payload.pricing.mode === "call"
      ? {
          ...emptyModelPricing(),
          mode: "call" as const,
          pricePerCall: payload.pricing.price_per_call,
        }
      : {
          mode: "token" as const,
          inputPricePerMillion: payload.pricing.input_price_per_million,
          outputPricePerMillion: payload.pricing.output_price_per_million,
          cachedPricePerMillion: payload.pricing.cached_price_per_million,
          pricePerCall: 0,
        };

  return {
    id: payload.id,
    owned_by: payload.owned_by,
    description: payload.description,
    enabled: payload.enabled,
    source,
    pricing,
  };
}

function modelConfigCollectionPath(scope: ModelScope): string {
  return scope === "library" ? "/model-configs?scope=library" : "/model-configs";
}

function modelConfigItemPath(modelId: string, scope: ModelScope): string {
  const suffix = scope === "library" ? "?scope=library" : "";
  return `/model-configs/${encodeURIComponent(modelId)}${suffix}`;
}

export async function saveModelConfig(form: ModelFormState, scope: ModelScope) {
  const payload = buildModelPayload(form);
  if (!payload.id) {
    throw new Error("Model ID is required");
  }

  if (form.originalId) {
    await apiClient.put(modelConfigItemPath(form.originalId, scope), payload);
  } else {
    await apiClient.post(modelConfigCollectionPath(scope), payload);
  }

  return payloadToModel(payload, scope === "library" ? "seed" : "user");
}

export function formatPrice(model: ModelItem, notPricedLabel: string): string {
  return formatModelPrice(model.pricing, notPricedLabel);
}

export function hasPricing(model: ModelItem): boolean {
  return hasModelPricing(model.pricing);
}

export function normalizeOwnerValue(value: string): string {
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}

export function buildOwnerPresetDrafts(
  models: ModelItem[],
  presets: ModelOwnerPreset[],
): ModelOwnerPreset[] {
  const map = new Map<string, ModelOwnerPreset>();
  for (const preset of presets) {
    const value = normalizeOwnerValue(preset.value);
    if (!value) continue;
    map.set(value, { ...preset, value });
  }
  for (const model of models) {
    const value = normalizeOwnerValue(model.owned_by);
    if (!value || map.has(value)) continue;
    map.set(value, {
      value,
      label: model.owned_by || value,
      description: "",
      enabled: true,
      modelCount: 0,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function toOwnerFormState(owner: ModelOwnerPreset): OwnerFormState {
  return {
    originalValue: owner.value,
    value: owner.value,
    label: owner.label,
    description: owner.description,
    enabled: owner.enabled,
  };
}

export function normalizeOwnerPresetItems(presets: ModelOwnerPreset[]) {
  const items = presets
    .map((owner) => ({
      value: normalizeOwnerValue(owner.value),
      label: owner.label.trim(),
      description: owner.description.trim(),
      enabled: owner.enabled,
    }))
    .filter((owner) => owner.value && owner.label);

  return Array.from(new Map(items.map((item) => [item.value, item])).values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

export function normalizeOpenRouterSyncState(payload: unknown): OpenRouterModelSyncState {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return {
    enabled: record.enabled === true,
    intervalMinutes: Math.max(60, Math.round(asNumber(record.interval_minutes) || 1440)),
    lastSyncAt: String(record.last_sync_at ?? ""),
    lastSuccessAt: String(record.last_success_at ?? ""),
    lastError: String(record.last_error ?? ""),
    lastSeen: Math.round(asNumber(record.last_seen)),
    lastAdded: Math.round(asNumber(record.last_added)),
    lastUpdated: Math.round(asNumber(record.last_updated)),
    lastSkipped: Math.round(asNumber(record.last_skipped)),
    running: record.running === true,
  };
}

export function normalizeOpenRouterSyncResult(payload: unknown): OpenRouterModelSyncResult | null {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  if (!("seen" in record) && !("added" in record) && !("skipped" in record)) return null;
  return {
    seen: Math.round(asNumber(record.seen)),
    added: Math.round(asNumber(record.added)),
    updated: Math.round(asNumber(record.updated)),
    skipped: Math.round(asNumber(record.skipped)),
  };
}

export function syncIntervalHoursValue(intervalMinutes: number): string {
  return String(Math.max(1, Math.round(intervalMinutes / 60)));
}

export function syncIntervalMinutesFromHours(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1440;
  return Math.max(60, Math.round(parsed * 60));
}

export function formatSyncTimestamp(value: string, emptyLabel: string): string {
  if (!value) return emptyLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
