import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { LogsPage } from "@/modules/logs/LogsPage";
import { ThemeProvider } from "@/modules/ui/ThemeProvider";
import { ToastProvider } from "@/modules/ui/ToastProvider";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  fetchLogs: vi.fn(),
  fetchErrorLogs: vi.fn(),
  clearLogs: vi.fn(),
  downloadErrorLog: vi.fn(),
  downloadRequestLogById: vi.fn(),
  getConfig: vi.fn(),
}));

vi.mock("@/lib/http/apis", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/http/apis")>();
  return {
    ...mod,
    logsApi: {
      ...mod.logsApi,
      fetchLogs: mocks.fetchLogs,
      fetchErrorLogs: mocks.fetchErrorLogs,
      clearLogs: mocks.clearLogs,
      downloadErrorLog: mocks.downloadErrorLog,
      downloadRequestLogById: mocks.downloadRequestLogById,
    },
    configApi: {
      ...mod.configApi,
      getConfig: mocks.getConfig,
    },
  };
});

function renderLogsPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ToastProvider>
          <LogsPage />
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("LogsPage", () => {
  afterEach(async () => {
    await i18n.changeLanguage("zh-CN");
    vi.clearAllMocks();
  });

  test("shows file logging disabled guidance when config disables file logs", async () => {
    await i18n.changeLanguage("zh-CN");
    mocks.fetchLogs.mockResolvedValue({
      lines: [],
      "latest-timestamp": null,
    });
    mocks.getConfig.mockResolvedValue({ "logging-to-file": false });

    renderLogsPage();

    expect(await screen.findByText("文件日志未启用")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开配置页" })).toHaveAttribute("href", "/config");
  });

  test("defaults auto refresh to on", async () => {
    await i18n.changeLanguage("zh-CN");
    mocks.fetchLogs.mockResolvedValue({
      lines: [],
      "latest-timestamp": null,
    });
    mocks.getConfig.mockResolvedValue({ "logging-to-file": true });

    renderLogsPage();

    expect(await screen.findByRole("button", { name: "自动刷新：开" })).toBeInTheDocument();
  });

  test("treats an empty error log list as loaded instead of retrying", async () => {
    await i18n.changeLanguage("zh-CN");
    const user = userEvent.setup();

    mocks.fetchLogs.mockResolvedValue({
      lines: [],
      "latest-timestamp": null,
    });
    mocks.getConfig.mockResolvedValue({ "logging-to-file": true });
    mocks.fetchErrorLogs
      .mockResolvedValueOnce({ files: [] })
      .mockImplementation(() => new Promise(() => undefined));

    renderLogsPage();

    await user.click(await screen.findByRole("tab", { name: "错误日志" }));

    expect(await screen.findByText("暂无错误日志")).toBeInTheDocument();
    await waitFor(() => expect(mocks.fetchErrorLogs).toHaveBeenCalledTimes(1));
  });
});
