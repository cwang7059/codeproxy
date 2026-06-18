import { describe, expect, test } from "vitest";
import type { RoutingChannelGroupEntry } from "@/modules/config/visual/types";
import {
  computeChannelGroupPageStats,
  filterChannelGroupEntries,
} from "@/modules/channel-groups/channel-groups-page-utils";

const sampleGroups: RoutingChannelGroupEntry[] = [
  {
    id: "group-a",
    name: "Team A",
    description: "Primary pool",
    strategy: "round-robin",
    allowedModels: [],
    channels: [{ id: "c1", name: "Claude A", priority: "" }],
  },
  {
    id: "group-b",
    name: "Team B",
    description: "Backup pool",
    strategy: "round-robin",
    allowedModels: ["gpt-5.4"],
    channels: [{ id: "c2", name: "Codex B", priority: "" }],
  },
];

describe("channel-groups-page-utils", () => {
  test("computeChannelGroupPageStats summarizes groups and routes", () => {
    const staleMap = new Map<string, unknown[]>([["group-b", [{}]]]);

    expect(computeChannelGroupPageStats(sampleGroups, staleMap, 3)).toEqual({
      total: 2,
      healthy: 1,
      invalid: 1,
      routes: 3,
    });
  });

  test("filterChannelGroupEntries supports search and status filters", () => {
    const staleMap = new Map<string, unknown[]>([["group-b", [{}]]]);

    expect(filterChannelGroupEntries(sampleGroups, "claude", "", staleMap)).toHaveLength(1);
    expect(filterChannelGroupEntries(sampleGroups, "", "invalid", staleMap)).toHaveLength(1);
    expect(filterChannelGroupEntries(sampleGroups, "team", "healthy", staleMap)).toHaveLength(1);
  });
});
