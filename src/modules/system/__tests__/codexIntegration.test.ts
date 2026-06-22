import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  connectDesktopCodex,
  LOCAL_DEV_KEY,
  resolveCodexApiKey,
} from "@/modules/system/codexIntegration";

const mocks = vi.hoisted(() => ({
  listEntries: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  applyDesktopCodexIntegration: vi.fn(),
}));

vi.mock("@/lib/http/apis/api-keys", () => ({
  apiKeyEntriesApi: {
    list: mocks.listEntries,
    update: mocks.update,
    delete: mocks.delete,
  },
}));

vi.mock("@/lib/desktop", () => ({
  applyDesktopCodexIntegration: mocks.applyDesktopCodexIntegration,
}));

describe("codexIntegration", () => {
  beforeEach(() => {
    mocks.listEntries.mockReset();
    mocks.update.mockReset();
    mocks.delete.mockReset();
    mocks.applyDesktopCodexIntegration.mockReset();
    mocks.applyDesktopCodexIntegration.mockResolvedValue({ managed: true });
  });

  test("admin resolves local-dev-key and creates it when missing", async () => {
    mocks.listEntries.mockResolvedValue([{ key: "other-key", name: "Other" }]);

    await expect(resolveCodexApiKey("admin")).resolves.toBe(LOCAL_DEV_KEY);
    expect(mocks.update).toHaveBeenCalled();
  });

  test("user resolves first active bound key", async () => {
    mocks.listEntries.mockResolvedValue([
      { key: "sk-user-1", name: "User Key", disabled: false },
      { key: "sk-user-2", name: "Backup", disabled: false },
    ]);

    await expect(resolveCodexApiKey("user")).resolves.toBe("sk-user-1");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("user without keys throws codex_no_api_key", async () => {
    mocks.listEntries.mockResolvedValue([]);

    await expect(resolveCodexApiKey("user")).rejects.toThrow("codex_no_api_key");
  });

  test("connectDesktopCodex passes resolved key to desktop bridge", async () => {
    mocks.listEntries.mockResolvedValue([{ key: LOCAL_DEV_KEY, name: "Local Codex Dev" }]);

    await connectDesktopCodex("http://example.com:8317", "admin");

    expect(mocks.applyDesktopCodexIntegration).toHaveBeenCalledWith(
      "http://example.com:8317",
      LOCAL_DEV_KEY,
    );
  });
});
