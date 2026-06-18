import type { PropsWithChildren, ReactNode } from "react";
import { desktopWindowRegion, isDesktopFrameless } from "@/lib/desktop";

function handleToggleMaximize() {
  void window.codeProxyDesktop?.toggleWindowMaximize?.();
}

export function DesktopWindowDragBar({
  className,
  children,
}: PropsWithChildren<{
  className?: string;
}>) {
  if (!isDesktopFrameless()) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={["relative shrink-0", className].filter(Boolean).join(" ")}>
      <div
        className="absolute inset-0"
        style={desktopWindowRegion("drag")}
        onDoubleClick={handleToggleMaximize}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

export function DesktopWindowDragPassThrough({ children }: { children: ReactNode }) {
  if (!isDesktopFrameless()) {
    return <>{children}</>;
  }

  return <div className="pointer-events-none relative z-10 h-full select-none">{children}</div>;
}
