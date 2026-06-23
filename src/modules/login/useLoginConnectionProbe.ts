import { useEffect, useState } from "react";
import {
  probeManagementEndpoint,
  type LoginConnectionStatus,
} from "@/modules/login/login-connection-probe";

export function useLoginConnectionProbe(apiBase: string, debounceMs = 500) {
  const [status, setStatus] = useState<LoginConnectionStatus>("idle");

  useEffect(() => {
    if (!apiBase.trim()) {
      setStatus("invalid");
      return undefined;
    }

    setStatus("checking");
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void probeManagementEndpoint(apiBase, controller.signal)
        .then((next) => {
          if (!controller.signal.aborted) {
            setStatus(next);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setStatus("unreachable");
          }
        });
    }, debounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [apiBase, debounceMs]);

  return status;
}
