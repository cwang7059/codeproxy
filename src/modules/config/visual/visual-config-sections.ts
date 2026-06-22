import type { TFunction } from "i18next";

export type VisualConfigSectionId =
  | "basics"
  | "tls"
  | "remote"
  | "cors"
  | "switches"
  | "proxy-retry"
  | "kimi-headers"
  | "log-limits"
  | "quota"
  | "streaming"
  | "payload-default"
  | "payload-override"
  | "payload-filter";

export type VisualConfigSectionDef = {
  id: VisualConfigSectionId;
  titleKey: string;
  descKey?: string;
  searchTerms: string[];
};

export const VISUAL_CONFIG_SECTIONS: VisualConfigSectionDef[] = [
  {
    id: "basics",
    titleKey: "visual_config.basics",
    descKey: "visual_config.basics_desc",
    searchTerms: ["host", "port", "auth-dir", "auth dir", "api key"],
  },
  {
    id: "tls",
    titleKey: "visual_config.tls",
    descKey: "visual_config.tls_desc",
    searchTerms: ["tls", "tls.cert", "tls.key", "certificate", "ssl"],
  },
  {
    id: "remote",
    titleKey: "visual_config.remote_mgmt",
    descKey: "visual_config.remote_desc",
    searchTerms: [
      "remote-management",
      "allow-remote",
      "disable-control-panel",
      "secret-key",
      "panel-github-repository",
    ],
  },
  {
    id: "cors",
    titleKey: "visual_config.cors_title",
    descKey: "visual_config.cors_desc",
    searchTerms: ["cors", "cors-allow-origins", "chrome-extension", "origin"],
  },
  {
    id: "switches",
    titleKey: "visual_config.switches",
    descKey: "visual_config.runtime_desc",
    searchTerms: [
      "debug",
      "commercial-mode",
      "logging-to-file",
      "usage-statistics-enabled",
      "auto-update",
      "docker-image",
    ],
  },
  {
    id: "proxy-retry",
    titleKey: "visual_config.proxy_retry",
    descKey: "visual_config.proxy_retry_card_desc",
    searchTerms: [
      "proxy-url",
      "request-retry",
      "max-retry-interval",
      "prefer-ipv4",
      "force-model-prefix",
      "ws-auth",
    ],
  },
  {
    id: "kimi-headers",
    titleKey: "visual_config.kimi_headers",
    descKey: "visual_config.kimi_headers_desc",
    searchTerms: ["kimi", "user-agent", "x-msh-platform", "x-msh-version"],
  },
  {
    id: "log-limits",
    titleKey: "visual_config.log_limits",
    descKey: "visual_config.log_limits_desc",
    searchTerms: ["logs-max-total-size-mb", "log size"],
  },
  {
    id: "quota",
    titleKey: "visual_config.quota_strategy",
    descKey: "visual_config.quota_strategy_desc",
    searchTerms: [
      "quota-exceeded",
      "switch-project",
      "switch-preview-model",
      "quota",
    ],
  },
  {
    id: "streaming",
    titleKey: "visual_config.streaming",
    descKey: "visual_config.streaming_desc",
    searchTerms: [
      "streaming",
      "keepalive-seconds",
      "bootstrap-retries",
      "nonstream-keepalive-interval",
    ],
  },
  {
    id: "payload-default",
    titleKey: "visual_config.payload_default",
    descKey: "visual_config.payload_default_desc",
    searchTerms: ["payload.default", "payload default", "default rule"],
  },
  {
    id: "payload-override",
    titleKey: "visual_config.payload_override",
    descKey: "visual_config.payload_override_desc",
    searchTerms: ["payload.override", "payload override", "override rule"],
  },
  {
    id: "payload-filter",
    titleKey: "visual_config.payload_filter",
    descKey: "visual_config.payload_filter_desc",
    searchTerms: ["payload.filter", "payload filter", "filter rule"],
  },
];

const DEFAULT_EXPANDED: VisualConfigSectionId[] = ["basics"];

export function readDefaultExpandedSections(): Set<VisualConfigSectionId> {
  return new Set(DEFAULT_EXPANDED);
}

export function findMatchingSections(
  query: string,
  t: TFunction,
): VisualConfigSectionId[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return VISUAL_CONFIG_SECTIONS.filter((section) => {
    const title = t(section.titleKey).toLowerCase();
    const desc = section.descKey ? t(section.descKey).toLowerCase() : "";
    const terms = section.searchTerms.map((term) => term.toLowerCase());
    return (
      title.includes(q) ||
      desc.includes(q) ||
      terms.some((term) => term.includes(q) || q.includes(term))
    );
  }).map((section) => section.id);
}

export function getSectionDef(
  id: VisualConfigSectionId,
): VisualConfigSectionDef | undefined {
  return VISUAL_CONFIG_SECTIONS.find((section) => section.id === id);
}
