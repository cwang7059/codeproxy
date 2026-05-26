import { beforeEach, describe, expect, test, vi } from "vitest";
import { apiClient } from "@/lib/http/client";
import {
  ccSwitchImportConfigsApi,
  normalizeCcSwitchImportConfigs,
} from "@/lib/http/apis/ccswitch-import-configs";

vi.mock("@/lib/http/client", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedApiPut = vi.mocked(apiClient.put);

describe("ccSwitchImportConfigsApi", () => {
  beforeEach(() => {
    mockedApiPut.mockReset();
    mockedApiPut.mockResolvedValue(undefined);
  });

  test("serializes model mappings for database-backed persistence", async () => {
    await ccSwitchImportConfigsApi.replace([
      {
        id: "kimi-code",
        clientType: "claude",
        providerName: "Kimi code",
        note: "kimicode",
        enabled: true,
        defaultModel: "kimi-k2.5",
        allowedChannelGroups: ["kimicode"],
        routePath: "/kimicode/cs_kimi",
        endpointPath: "/v1",
        usageAutoInterval: 30,
        apiKeyField: "ANTHROPIC_API_KEY",
        modelMappings: [
          { role: "main", requestModel: "kimi-k2.5", targetModel: "kimi-k2.5" },
          { role: "haiku", requestModel: "claude-3-5-haiku", targetModel: "kimi-k2.5" },
        ],
      },
    ]);

    expect(mockedApiPut).toHaveBeenCalledWith("/ccswitch-import-configs", [
      expect.objectContaining({
        id: "kimi-code",
        "client-type": "claude",
        enabled: true,
        "route-path": "/kimicode/cs_kimi",
        "model-mappings": [
          { role: "main", "request-model": "kimi-k2.5", "target-model": "kimi-k2.5" },
          {
            role: "haiku",
            "request-model": "claude-3-5-haiku",
            "target-model": "kimi-k2.5",
          },
        ],
      }),
    ]);
  });

  test("normalizes missing and disabled enabled flags", () => {
    const configs = normalizeCcSwitchImportConfigs([
      {
        id: "enabled-legacy",
        "client-type": "codex",
        "provider-name": "Relay Codex",
        "default-model": "gpt-5.5",
      },
      {
        id: "disabled",
        "client-type": "codex",
        "provider-name": "Relay Disabled",
        enabled: false,
        "default-model": "gpt-5.5",
      },
    ]);

    expect(configs.map((config) => [config.id, config.enabled])).toEqual([
      ["enabled-legacy", true],
      ["disabled", false],
    ]);
  });
});
