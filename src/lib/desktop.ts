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

export async function setDesktopBackendBase(backendBase: string): Promise<string | null> {
  if (!window.codeProxyDesktop?.isDesktop || !window.codeProxyDesktop?.setBackendBase) {
    return null;
  }

  try {
    const nextBase = await window.codeProxyDesktop.setBackendBase(backendBase);
    return nextBase?.trim() || null;
  } catch {
    return null;
  }
}

export async function probeDesktopBackendBase(
  backendBase: string,
): Promise<"idle" | "checking" | "reachable" | "unreachable" | "invalid" | null> {
  if (!window.codeProxyDesktop?.isDesktop || !window.codeProxyDesktop?.probeBackendBase) {
    return null;
  }

  try {
    return await window.codeProxyDesktop.probeBackendBase(backendBase);
  } catch {
    return "unreachable";
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
