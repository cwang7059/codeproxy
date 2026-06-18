import type { RoutingChannelGroupEntry } from "@/modules/config/visual/types";

export type ChannelGroupStatusFilter = "" | "healthy" | "invalid";

export type ChannelGroupPageStats = {
  total: number;
  healthy: number;
  invalid: number;
  routes: number;
};

export function computeChannelGroupPageStats(
  groups: RoutingChannelGroupEntry[],
  staleChannelsByGroup: Map<string, unknown[]>,
  routeCount: number,
): ChannelGroupPageStats {
  let healthy = 0;
  let invalid = 0;

  for (const group of groups) {
    const staleCount = staleChannelsByGroup.get(group.id)?.length ?? 0;
    if (staleCount > 0) invalid += 1;
    else healthy += 1;
  }

  return {
    total: groups.length,
    healthy,
    invalid,
    routes: routeCount,
  };
}

export function filterChannelGroupEntries(
  groups: RoutingChannelGroupEntry[],
  search: string,
  statusFilter: ChannelGroupStatusFilter,
  staleChannelsByGroup: Map<string, unknown[]>,
): RoutingChannelGroupEntry[] {
  const query = search.trim().toLowerCase();

  return groups.filter((group) => {
    const staleCount = staleChannelsByGroup.get(group.id)?.length ?? 0;
    const isInvalid = staleCount > 0;

    if (statusFilter === "healthy" && isInvalid) return false;
    if (statusFilter === "invalid" && !isInvalid) return false;
    if (!query) return true;

    const haystack = [
      group.name,
      group.description,
      ...group.channels.map((channel) => channel.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}
