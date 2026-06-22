import { expect, test, type Page, type Route } from "@playwright/test";

/** Matches `electron/main.cjs` default window size. */
const ELECTRON_VIEWPORT = { width: 1080, height: 700 };

const EMPTY_DASHBOARD_SUMMARY = {
  kpi: {
    total_requests: 0,
    success_requests: 0,
    failed_requests: 0,
    success_rate: 0,
    input_tokens: 0,
    output_tokens: 0,
    reasoning_tokens: 0,
    cached_tokens: 0,
    total_tokens: 0,
    total_cost: 0,
  },
  trends: {
    request_volume: [],
    success_rate: [],
    total_tokens: [],
    total_cost: [],
    failed_requests: [],
    throughput_series: [],
  },
  meta: { generated_at: new Date().toISOString() },
  counts: {
    api_keys: 0,
    providers_total: 0,
    gemini_keys: 0,
    claude_keys: 0,
    codex_keys: 0,
    vertex_keys: 0,
    openai_providers: 0,
    auth_files: 0,
  },
  days: 7,
};

const EMPTY_SYSTEM_STATS = {
  db_size_bytes: 0,
  log_content_store_bytes: 0,
  log_dir_size_bytes: 0,
  log_size_bytes: 0,
  process_mem_bytes: 0,
  process_mem_pct: 0,
  process_cpu_pct: 0,
  go_routines: 0,
  go_heap_bytes: 0,
  system_cpu_pct: 0,
  system_mem_total: 0,
  system_mem_used: 0,
  system_mem_pct: 0,
  net_bytes_sent: 0,
  net_bytes_recv: 0,
  net_send_rate: 0,
  net_recv_rate: 0,
  disk_total: 0,
  disk_used: 0,
  disk_free: 0,
  disk_pct: 0,
  uptime_seconds: 0,
  start_time: new Date().toISOString(),
  channel_latency: [],
  active_concurrency: null,
  total_in_flight: 0,
  total_rpm: 0,
  total_tpm: 0,
};

const setAuthed = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "code-proxy-admin-auth",
      JSON.stringify({
        apiBase: "http://127.0.0.1:8317",
        managementKey: "test-management-key",
        rememberPassword: true,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      }),
    );
  });
};

const fulfillJson = async (route: Route, body: unknown) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

const mockManagementApis = async (page: Page) => {
  await page.route("**/v0/management/**", async (route) => {
    const url = route.request().url();
    const { pathname } = new URL(url);

    if (pathname.endsWith("/config")) {
      await fulfillJson(route, {});
      return;
    }
    if (pathname.endsWith("/config.yaml")) {
      await route.fulfill({
        status: 200,
        contentType: "text/yaml; charset=utf-8",
        body: "debug: false\n",
      });
      return;
    }
    if (pathname.includes("/dashboard-summary")) {
      await fulfillJson(route, EMPTY_DASHBOARD_SUMMARY);
      return;
    }
    if (pathname.endsWith("/system-stats")) {
      await fulfillJson(route, EMPTY_SYSTEM_STATS);
      return;
    }
    if (pathname.endsWith("/api-key-entries")) {
      await fulfillJson(route, []);
      return;
    }
    if (pathname.endsWith("/api-keys")) {
      await fulfillJson(route, []);
      return;
    }
    if (pathname.endsWith("/auth-files")) {
      await fulfillJson(route, { files: [] });
      return;
    }
    if (pathname.endsWith("/openai-compatibility")) {
      await fulfillJson(route, { "openai-compatibility": [] });
      return;
    }
    if (pathname.endsWith("/identity-fingerprint")) {
      await fulfillJson(route, {
        "identity-fingerprint": {},
        defaults: {},
      });
      return;
    }
    if (pathname.endsWith("/usage")) {
      await fulfillJson(route, { apis: {} });
      return;
    }

    await fulfillJson(route, {});
  });
};

const readHorizontalOverflow = async (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const main = document.getElementById("main-content");
    return {
      document: root.scrollWidth - root.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
    };
  });

const KEY_PAGES: Array<{ path: string; ready: RegExp }> = [
  { path: "/dashboard", ready: /Track runtime health|一站式查看运行健康|section_business/i },
  { path: "/models", ready: /models|模型/i },
  { path: "/channel-groups", ready: /channel groups|通道组/i },
  { path: "/api-keys", ready: /api keys|api 密钥/i },
  { path: "/config", ready: /config|配置/i },
  { path: "/identity-fingerprint", ready: /identity fingerprint|身份指纹/i },
  { path: "/ai-providers", ready: /ai providers|ai 提供方/i },
  { path: "/monitor", ready: /overview|概览/i },
];

test.describe("Electron default viewport 1080x700", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(ELECTRON_VIEWPORT);
    await setAuthed(page);
    await mockManagementApis(page);
  });

  for (const { path, ready } of KEY_PAGES) {
    test(`${path} has no page-level horizontal overflow`, async ({ page }) => {
      await page.goto(`/#${path}`);
      await expect(page.locator("#main-content")).toBeVisible();
      await expect(page.getByText(ready).first()).toBeVisible();
      const overflow = await readHorizontalOverflow(page);
      expect(overflow.document).toBeLessThanOrEqual(2);
      expect(overflow.main).toBeLessThanOrEqual(2);
    });
  }
});
