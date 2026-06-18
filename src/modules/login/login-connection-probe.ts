import { normalizeApiBase } from "@/lib/connection";

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
  if (!normalized) return "invalid";

  try {
    const response = await fetch(`${normalized}/v0/management`, {
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
  } catch {
    return "unreachable";
  }
}
