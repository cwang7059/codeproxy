import type { PropsWithChildren } from "react";

export function RouteViewport({ children }: PropsWithChildren) {
  return <div className="flex h-full min-h-0 flex-1 flex-col">{children}</div>;
}
