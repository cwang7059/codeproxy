import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { MonitorHubPage } from "@/modules/monitor/MonitorHubPage";
import { ThemeProvider } from "@/modules/ui/ThemeProvider";

vi.mock("@/modules/monitor/MonitorPage", () => ({
  MonitorPage: () => <div>Monitor Overview Content</div>,
}));

vi.mock("@/modules/monitor/RequestLogsPage", () => ({
  RequestLogsPage: () => <div>Request Logs Content</div>,
}));

function renderHub(initialEntry: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/monitor" element={<MonitorHubPage />} />
          <Route path="/monitor/request-logs" element={<MonitorHubPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("MonitorHubPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  test("shows overview by default and switches to request logs tab", async () => {
    renderHub("/monitor");

    expect(screen.getByText("Monitor Overview Content")).toBeInTheDocument();
    expect(screen.queryByText("Request Logs Content")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /request logs/i }));

    expect(screen.getByText("Request Logs Content")).toBeInTheDocument();
    expect(screen.queryByText("Monitor Overview Content")).not.toBeInTheDocument();
  });

  test("opens request logs tab from direct route", () => {
    renderHub("/monitor/request-logs");

    expect(screen.getByText("Request Logs Content")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /request logs/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
