import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Reveal } from "@/modules/ui/Reveal";

const LazyAppShell = lazy(() =>
  import("@/modules/ui/AppShell").then((m) => ({ default: m.AppShell })),
);

export function DashboardLayout() {
  const location = useLocation();
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Suspense>
        <LazyAppShell>
          <Reveal key={location.pathname}>
            <Outlet />
          </Reveal>
        </LazyAppShell>
      </Suspense>
    </div>
  );
}
