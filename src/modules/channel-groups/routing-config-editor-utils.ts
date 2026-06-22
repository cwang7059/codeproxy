import type { ChannelGroupChannelDetail } from "@/lib/http/apis/channel-groups";
import type { RoutingChannelGroupMemberEntry, RoutingPathRouteEntry } from "@/modules/config/visual/types";
import { makeClientId } from "@/modules/config/visual/types";
import type { GroupDraft, RoutingModelLoadResult, RoutingModelOption } from "@/modules/channel-groups/routing-config-editor-types";

export const createEmptyGroupDraft = (): GroupDraft => ({
  name: "",
  description: "",
  strategy: "round-robin",
  channels: [],
  allowedModels: [],
  routes: [{ ...emptyRouteDraft() }],
});

export const emptyRouteDraft = (): RoutingPathRouteEntry => ({
  id: makeClientId(),
  path: "",
  group: "",
  stripPrefix: true,
  fallback: "none",
});

export function cloneMembers(members: RoutingChannelGroupMemberEntry[]): RoutingChannelGroupMemberEntry[] {
  return members.map((member) => ({
    id: member.id || makeClientId(),
    name: member.name,
    priority: member.priority,
  }));
}

export function syncDraftChannels(
  currentChannels: RoutingChannelGroupMemberEntry[],
  selectedChannels: string[],
): RoutingChannelGroupMemberEntry[] {
  const existing = new Map(
    currentChannels
      .map((channel) => [channel.name.trim().toLowerCase(), channel] as const)
      .filter(([name]) => name),
  );

  return selectedChannels
    .map((channelName) => channelName.trim())
    .filter((channelName, index, list) => channelName && list.indexOf(channelName) === index)
    .map((channelName) => {
      const matched = existing.get(channelName.toLowerCase());
      return matched
        ? { ...matched, name: channelName }
        : { id: makeClientId(), name: channelName, priority: "" };
    });
}

export function parsePriority(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function normalizeRoutePathInput(value: string): string {
  let trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol && parsed.host) {
      trimmed = decodeURIComponent(parsed.pathname || "");
    }
  } catch {
    // Keep non-URL inputs as-is.
  }

  const queryIndex = trimmed.search(/[?#]/);
  if (queryIndex >= 0) {
    trimmed = trimmed.slice(0, queryIndex);
  }

  trimmed = trimmed.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "";

  const segments = trimmed.split("/");
  for (const segment of segments) {
    if (!segment) return "";
    if (Array.from(segment).some((char) => !/[\p{L}\p{N}_-]/u.test(char))) {
      return "";
    }
  }

  return `/${trimmed}`;
}

export function summarizeList(values: string[], moreLabel: string): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  return `${values[0]}${moreLabel.replace("{{count}}", String(values.length - 1))}`;
}

export function summarizePriorityMode(
  members: RoutingChannelGroupMemberEntry[],
  roundRobinLabel: string,
  priorityShortLabel: string,
): string {
  const prioritized = members
    .map((member) => ({
      name: member.name.trim(),
      priority: parsePriority(member.priority),
    }))
    .filter((member) => member.name && member.priority !== null);

  if (prioritized.length === 0) return roundRobinLabel;

  const distinct = new Set(prioritized.map((member) => member.priority));
  if (distinct.size <= 1) return roundRobinLabel;

  const top = prioritized.reduce((best, current) => {
    if (!best || (current.priority ?? 0) > (best.priority ?? 0)) return current;
    return best;
  }, prioritized[0]);
  if (!top.priority) return roundRobinLabel;
  return `${top.name} · ${priorityShortLabel.replace("{{value}}", String(top.priority))}`;
}

export function normalizeChannelName(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeRoutingModelOption(model: RoutingModelLoadResult): RoutingModelOption | null {
  if (typeof model === "string") {
    const id = model.trim();
    return id ? { id } : null;
  }
  const id = String(model.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    owned_by: model.owned_by,
    description: model.description,
    pricing: model.pricing,
  };
}

export function readChannelDisplayTags(detail?: ChannelGroupChannelDetail | null): string[] {
  if (!detail?.display_tags || !Array.isArray(detail.display_tags)) return [];
  return detail.display_tags
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter((tag, index, list) => Boolean(tag) && list.indexOf(tag) === index);
}
