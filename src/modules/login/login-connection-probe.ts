import { MANAGEMENT_API_PREFIX } from "@/lib/constants";
import { normalizeApiBase } from "@/lib/connection";
import { isDesktopClient } from "@/lib/desktop";

export type LoginConnectionStatus =
  | "idle"
  | "checking"
  | "reachable"
  | "unreachable"
  | "invalid";

export async function probeManagementEndpoint(
  apiBase: string,
  signal?: AbortSignal,
): Promise<LoginConnectionStatus> {
  const normalized = normalizeApiBase(apiBase);
  if (!normalized && !isDesktopClient()) {
    return "invalid";
  }

  const probeUrl = isDesktopClient()
    ? MANAGEMENT_API_PREFIX
    : `${normalized}${MANAGEMENT_API_PREFIX}`;

  try {
    const response = await fetch(probeUrl, {
      method: "GET",
      signal,
    });
    if (response.ok || response.status === 401 || response.status === 403) {
      return "reachable";
    }
    if (response.status >= 500) {
      return "unreachable";
    }
    return "reachable";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "idle";
    }
    return "unreachable";
  }
}
