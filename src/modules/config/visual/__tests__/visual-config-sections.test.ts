import { describe, expect, test } from "vitest";
import i18n from "@/i18n";
import {
  findMatchingSections,
  readDefaultExpandedSections,
} from "@/modules/config/visual/visual-config-sections";

describe("visual-config-sections", () => {
  test("defaults to basics expanded", () => {
    const expanded = readDefaultExpandedSections();
    expect(expanded.has("basics")).toBe(true);
    expect(expanded.has("tls")).toBe(false);
  });

  test("finds sections by yaml key and title", () => {
    const t = i18n.getFixedT("en");
    expect(findMatchingSections("tls.cert", t)).toContain("tls");
    expect(findMatchingSections("cors-allow-origins", t)).toContain("cors");
    expect(findMatchingSections("proxy-url", t)).toContain("proxy-retry");
    expect(findMatchingSections("zzz-no-match", t)).toEqual([]);
  });
});
