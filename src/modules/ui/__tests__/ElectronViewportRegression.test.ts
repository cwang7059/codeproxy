import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { COMPACT_VIEWPORT_QUERY } from "@/hooks/useCompactViewport";

export const ELECTRON_DEFAULT_WIDTH = 1080;
export const ELECTRON_DEFAULT_HEIGHT = 700;

const srcRoot = resolve(__dirname, "../../..");
const projectRoot = resolve(srcRoot, "..");

const readModule = (path: string) => readFileSync(resolve(srcRoot, path), "utf8");

describe("Electron 1080×700 viewport regression", () => {
  test("electron main uses the documented default window size", () => {
    const source = readFileSync(resolve(projectRoot, "electron/main.cjs"), "utf8");
    expect(source).toContain(`const DEFAULT_WINDOW_WIDTH = ${ELECTRON_DEFAULT_WIDTH}`);
    expect(source).toContain(`const DEFAULT_WINDOW_HEIGHT = ${ELECTRON_DEFAULT_HEIGHT}`);
  });

  test("compact viewport breakpoint stays below the electron default width", () => {
    expect(COMPACT_VIEWPORT_QUERY).toBe("(max-width: 1023px)");
    expect(ELECTRON_DEFAULT_WIDTH).toBeGreaterThan(1023);
  });

  test("AppShell main scroll region clips horizontal overflow", () => {
    const source = readModule("modules/ui/AppShell.tsx");
    expect(source).toContain("overflow-x-hidden");
    expect(source).toContain("min-w-0");
    expect(source).toContain("min-h-0");
  });

  test("compact-layout hotspots use useCompactViewport below lg breakpoint", () => {
    for (const path of [
      "modules/models/components/ModelsLibraryTab.tsx",
      "modules/channel-groups/RoutingConfigEditor.tsx",
      "modules/channel-groups/components/ChannelGroupEditorModal.tsx",
    ]) {
      expect(readModule(path), path).toContain("useCompactViewport");
    }
  });

  test("key pages use page-stack layout", () => {
    for (const path of [
      "modules/dashboard/DashboardPage.tsx",
      "modules/api-keys/ApiKeysPage.tsx",
      "modules/channel-groups/ChannelGroupsPage.tsx",
      "modules/models/ModelsPage.tsx",
      "modules/config/ConfigPage.tsx",
      "modules/logs/LogsPage.tsx",
      "modules/proxies/ProxiesPage.tsx",
      "modules/auth-files/AuthFilesPage.tsx",
      "modules/providers/ProvidersPage.tsx",
      "modules/system/SystemPage.tsx",
      "modules/identity-fingerprint/IdentityFingerprintPage.tsx",
      "modules/image-generation/ImageGenerationPage.tsx",
    ]) {
      expect(readModule(path), path).toContain("page-stack");
    }
  });

  test("dense editors and tall pages guard against page-level horizontal overflow", () => {
    for (const path of [
      "modules/config/ConfigPage.tsx",
      "modules/system/SystemPage.tsx",
      "modules/identity-fingerprint/IdentityFingerprintPage.tsx",
      "modules/image-generation/ImageGenerationPage.tsx",
      "modules/providers/ProvidersPage.tsx",
    ]) {
      const source = readModule(path);
      expect(source, path).toMatch(/overflow-x-hidden|overflow-hidden/);
    }
  });

  test("wide tables scope horizontal scroll inside containers", () => {
    expect(readModule("modules/api-keys/components/ApiKeysKeysTab.tsx")).toContain("overflow-x-auto");
    expect(readModule("modules/channel-groups/components/ChannelGroupListPanel.tsx")).toContain(
      "overflow-x-auto",
    );
  });
});
