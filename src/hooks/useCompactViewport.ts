import { useMediaQuery } from "@/hooks/useMediaQuery";

export const COMPACT_VIEWPORT_QUERY = "(max-width: 1023px)";

export function useCompactViewport(): boolean {
  return useMediaQuery(COMPACT_VIEWPORT_QUERY);
}
