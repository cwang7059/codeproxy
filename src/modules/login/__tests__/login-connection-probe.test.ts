import { afterEach, describe, expect, test, vi } from "vitest";
import { probeManagementEndpoint } from "@/modules/login/login-connection-probe";

describe("login-connection-probe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns invalid for empty base", async () => {
    await expect(probeManagementEndpoint("")).resolves.toBe("invalid");
  });

  test("treats 401 as reachable management endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(probeManagementEndpoint("http://127.0.0.1:62512")).resolves.toBe("reachable");
  });

  test("returns unreachable on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(probeManagementEndpoint("http://127.0.0.1:62512")).resolves.toBe("unreachable");
  });
});
