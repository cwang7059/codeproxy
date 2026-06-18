import type { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { isDesktopFrameless } from "@/lib/desktop";
import { DesktopWindowChrome } from "@/modules/ui/DesktopWindowChrome";

function isLoginRoute(pathname: string) {
  return pathname.endsWith("/login");
}

export function DesktopFrame({ children }: PropsWithChildren) {
  const location = useLocation();
  const frameless = isDesktopFrameless();
  const showLoginChrome = frameless && isLoginRoute(location.pathname);

  if (!frameless) {
    return children;
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      {showLoginChrome ? <DesktopWindowChrome /> : null}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
