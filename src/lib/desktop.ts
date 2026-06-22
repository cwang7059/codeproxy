export function isDesktopClient(): boolean {
  return Boolean(window.codeProxyDesktop?.isDesktop);
}

export async function getDesktopBackendBase(): Promise<string | null> {
  if (!window.codeProxyDesktop?.isDesktop || !window.codeProxyDesktop?.getBackendBase) {
    return null;
  }

  try {
    const backendBase = await window.codeProxyDesktop.getBackendBase();
    return backendBase?.trim() || null;
  } catch {
    return null;
  }
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
