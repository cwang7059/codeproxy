import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { CodexConnectPrompt } from "@/modules/system/CodexConnectPrompt";
import { ThemeProvider } from "@/modules/ui/ThemeProvider";
import { ToastProvider } from "@/modules/ui/ToastProvider";

const mocks = vi.hoisted(() => ({
  isDesktop: true,
  getCodexStatus: vi.fn(),
  connectDesktopCodex: vi.fn(),
}));

vi.mock("@/lib/desktop", () => ({
  isDesktopClient: () => mocks.isDesktop,
  getDesktopCodexStatus: mocks.getCodexStatus,
}));

vi.mock("@/modules/system/codexIntegration", () => ({
  connectDesktopCodex: mocks.connectDesktopCodex,
}));

vi.mock("@/modules/auth/AuthProvider", () => ({
  useAuth: () => ({
    state: {
      isAuthenticated: true,
      isRestoring: false,
      apiBase: "https://relay.07230805.xyz",
      role: null,
    },
  }),
}));

function renderPrompt() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <CodexConnectPrompt />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe("CodexConnectPrompt", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    sessionStorage.clear();
    mocks.isDesktop = true;
    mocks.getCodexStatus.mockResolvedValue({ managed: false, path: "/home/user/.codex/config.toml" });
    mocks.connectDesktopCodex.mockResolvedValue({ managed: true });
  });

  test("opens after login when Codex is not managed", async () => {
    renderPrompt();

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Connect local Codex/i)).toBeInTheDocument();
  });

  test("connects Codex from the prompt", async () => {
    renderPrompt();
    await screen.findByRole("dialog");

    await userEvent.click(screen.getByRole("button", { name: /Connect Codex/i }));

    await waitFor(() => {
      expect(mocks.connectDesktopCodex).toHaveBeenCalledWith("https://relay.07230805.xyz", null);
    });
  });

  test("does not render on web clients", () => {
    mocks.isDesktop = false;
    renderPrompt();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
