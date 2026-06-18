export function isDesktopClient(): boolean {
  return Boolean(window.codeProxyDesktop?.isDesktop);
}

export function isDesktopFrameless(): boolean {
  return Boolean(window.codeProxyDesktop?.isDesktop && window.codeProxyDesktop?.frameless);
}

export function desktopWindowRegion(region: "drag" | "no-drag"): import("react").CSSProperties | undefined {
  if (!isDesktopFrameless()) {
    return undefined;
  }

  return { WebkitAppRegion: region } as import("react").CSSProperties;
}
