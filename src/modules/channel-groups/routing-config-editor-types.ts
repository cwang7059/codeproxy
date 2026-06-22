import type {
  RoutingChannelGroupMemberEntry,
  RoutingPathRouteEntry,
  RoutingStrategy,
} from "@/modules/config/visual/types";
import type { ModelPricing } from "@/modules/models/modelAvailability";

export type GroupDraft = {
  name: string;
  description: string;
  strategy: RoutingStrategy;
  channels: RoutingChannelGroupMemberEntry[];
  allowedModels: string[];
  routes: RoutingPathRouteEntry[];
};

export type RoutingModelOption = {
  id: string;
  owned_by?: string;
  description?: string;
  pricing?: ModelPricing;
};

export type RoutingModelLoadResult = string | RoutingModelOption;
