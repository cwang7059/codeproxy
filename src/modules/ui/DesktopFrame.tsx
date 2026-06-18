import type { PropsWithChildren } from "react";
import { isDesktopFrameless } from "@/lib/desktop";

export function DesktopFrame({ children }: PropsWithChildren) {
  if (!isDesktopFrameless()) {
    return children;
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-zinc-50 dark:bg-neutral-950">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
