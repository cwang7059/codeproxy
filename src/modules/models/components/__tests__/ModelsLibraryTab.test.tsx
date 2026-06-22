import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { ModelsLibraryTab } from "@/modules/models/components/ModelsLibraryTab";
import { defaultOpenRouterSyncState } from "@/modules/models/models-page-helpers";
import { ThemeProvider } from "@/modules/ui/ThemeProvider";

const useCompactViewport = vi.fn(() => false);

vi.mock("@/hooks/useCompactViewport", () => ({
  useCompactViewport: () => useCompactViewport(),
}));

const ownerSidebarProps = {
  totalModelCount: 2,
  libraryOwners: [
    { value: "anthropic", label: "Anthropic", description: "", enabled: true, modelCount: 1 },
  ],
  filteredLibraryOwners: [
    { value: "anthropic", label: "Anthropic", description: "", enabled: true, modelCount: 1 },
  ],
  ownerModelCounts: new Map([["anthropic", 1]]),
  ownerFilter: "",
  ownerSearchFilter: "",
  onOwnerFilterChange: vi.fn(),
  onOwnerSearchFilterChange: vi.fn(),
  onAddOwner: vi.fn(),
  onEditOwner: vi.fn(),
  onDeleteOwner: vi.fn(),
};

function renderTab(compact = false) {
  useCompactViewport.mockReturnValue(compact);
  return render(
    <ThemeProvider>
      <ModelsLibraryTab
        filterToolbar={<div>Filters</div>}
        modelTable={<div>Model table</div>}
        showingModelsFooter={null}
        ownerSidebar={ownerSidebarProps}
        openRouterSync={{
          syncState: defaultOpenRouterSyncState,
          loading: false,
          saving: false,
          running: false,
          error: null,
          syncIntervalHours: "1",
          onSyncIntervalHoursChange: vi.fn(),
          onSaveSettings: vi.fn(),
          onRunSync: vi.fn(),
        }}
      />
    </ThemeProvider>,
  );
}

describe("ModelsLibraryTab compact layout", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    useCompactViewport.mockReset();
    useCompactViewport.mockReturnValue(false);
  });

  test("keeps the owner sidebar visible on wide viewports", () => {
    renderTab(false);

    expect(screen.getByTestId("owner-sidebar-card")).toBeInTheDocument();
    expect(screen.queryByTestId("owner-sidebar-drawer")).not.toBeInTheDocument();
    expect(screen.getByTestId("owner-library-layout")).toHaveClass("lg:grid-cols-[18rem_minmax(0,1fr)]");
  });

  test("uses a collapsible owner drawer on compact viewports", async () => {
    renderTab(true);

    expect(screen.getByTestId("owner-sidebar-drawer")).toBeInTheDocument();
    expect(screen.queryByTestId("owner-sidebar-card")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /model owners/i }));
    expect(screen.getByTestId("owner-sidebar-card")).toBeInTheDocument();
  });
});
