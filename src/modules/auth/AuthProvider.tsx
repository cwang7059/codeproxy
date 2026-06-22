import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AUTH_STORAGE_KEY } from "@/lib/constants";
import {
  computeManagementApiBase,
  detectApiBaseFromLocation,
  normalizeApiBase,
} from "@/lib/connection";
import { getDesktopBackendBase, isDesktopClient, setDesktopBackendBase } from "@/lib/desktop";
import { apiClient } from "@/lib/http/client";
import { configApi } from "@/lib/http/apis";
import type { AuthSnapshot } from "@/lib/http/types";

const AUTH_PERSIST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface AuthContextState {
  state: {
    isAuthenticated: boolean;
    isRestoring: boolean;
    apiBase: string;
    managementKey: string;
    rememberPassword: boolean;
    serverVersion: string | null;
    serverBuildDate: string | null;
  };
  actions: {
    login: (input: {
      apiBase: string;
      managementKey: string;
      rememberPassword: boolean;
    }) => Promise<void>;
    logout: () => void;
    restore: () => Promise<void>;
    replaceManagementKey: (managementKey: string) => void;
    updateApiBase: (apiBase: string) => Promise<void>;
  };
  meta: {
    managementEndpoint: string;
  };
}

const AuthContext = createContext<AuthContextState | null>(null);

interface PersistedAuthSnapshot extends AuthSnapshot {
  expiresAt: number;
}

function isDesktopAuthStorageAvailable() {
  return Boolean(
    window.codeProxyDesktop?.isDesktop &&
      window.codeProxyDesktop?.readAuthSnapshot &&
      window.codeProxyDesktop?.writeAuthSnapshot &&
      window.codeProxyDesktop?.clearAuthSnapshot,
  );
}

const readAuthSnapshotFromLocalStorage = (): PersistedAuthSnapshot | null => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedAuthSnapshot>;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    if (!parsed.apiBase || !parsed.managementKey) {
      return null;
    }
    return parsed as PersistedAuthSnapshot;
  } catch {
    return null;
  }
};

function normalizePersistedAuthSnapshot(
  snapshot: Partial<PersistedAuthSnapshot> | null | undefined,
): AuthSnapshot | null {
  if (!snapshot) {
    return null;
  }
  if (typeof snapshot.expiresAt !== "number" || snapshot.expiresAt <= Date.now()) {
    return null;
  }
  if (!snapshot.apiBase || !snapshot.managementKey) {
    return null;
  }

  return {
    apiBase: normalizeApiBase(snapshot.apiBase),
    managementKey: snapshot.managementKey,
    rememberPassword: Boolean(snapshot.rememberPassword),
  };
}

const readAuthSnapshot = async (): Promise<AuthSnapshot | null> => {
  if (isDesktopAuthStorageAvailable()) {
    try {
      const snapshot = await window.codeProxyDesktop?.readAuthSnapshot?.();
      const normalized = normalizePersistedAuthSnapshot(snapshot);
      if (!normalized && snapshot) {
        await window.codeProxyDesktop?.clearAuthSnapshot?.();
      }
      return normalized;
    } catch {
      return null;
    }
  }

  return normalizePersistedAuthSnapshot(readAuthSnapshotFromLocalStorage());
};

const writeAuthSnapshot = async (snapshot: AuthSnapshot): Promise<void> => {
  const payload: PersistedAuthSnapshot = {
    ...snapshot,
    expiresAt: Date.now() + AUTH_PERSIST_TTL_MS,
  };

  if (isDesktopAuthStorageAvailable()) {
    await window.codeProxyDesktop?.writeAuthSnapshot?.(payload);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
};

const clearAuthSnapshot = async (): Promise<void> => {
  if (isDesktopAuthStorageAvailable()) {
    await window.codeProxyDesktop?.clearAuthSnapshot?.();
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export function AuthProvider({ children }: PropsWithChildren) {
  const desktopClient = isDesktopClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [apiBase, setApiBase] = useState("");
  const [managementKey, setManagementKey] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [serverBuildDate, setServerBuildDate] = useState<string | null>(null);

  const resolveRequestApiBase = useCallback(
    (targetApiBase: string) => (desktopClient ? detectApiBaseFromLocation() : targetApiBase),
    [desktopClient],
  );

  const bootstrap = useCallback(async () => {
    const desktopBase = desktopClient ? await getDesktopBackendBase() : null;
    const fallbackBase = desktopBase ?? detectApiBaseFromLocation();
    const snapshot = await readAuthSnapshot();

    const resolvedBase = snapshot?.apiBase ?? fallbackBase;
    const resolvedKey = snapshot?.managementKey ?? "";
    const resolvedRemember = snapshot?.rememberPassword ?? false;

    setApiBase(resolvedBase);
    setManagementKey(resolvedKey);
    setRememberPassword(resolvedRemember);

    apiClient.setConfig({
      apiBase: resolveRequestApiBase(resolvedBase),
      managementKey: resolvedKey,
    });

    if (!resolvedKey) {
      setIsAuthenticated(false);
      setIsRestoring(false);
      return;
    }

    try {
      await configApi.getConfig();
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      await clearAuthSnapshot();
    } finally {
      setIsRestoring(false);
    }
  }, [desktopClient, resolveRequestApiBase]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      void clearAuthSnapshot();
    };

    const handleVersion = (event: Event) => {
      const customEvent = event as CustomEvent<{
        version?: string | null;
        buildDate?: string | null;
      }>;
      setServerVersion(customEvent.detail?.version ?? null);
      setServerBuildDate(customEvent.detail?.buildDate ?? null);
    };

    window.addEventListener("unauthorized", handleUnauthorized);
    window.addEventListener("server-version-update", handleVersion as EventListener);

    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
      window.removeEventListener("server-version-update", handleVersion as EventListener);
    };
  }, []);

  const login = useCallback(
    async (input: { apiBase: string; managementKey: string; rememberPassword: boolean }) => {
      const normalizedBase = normalizeApiBase(input.apiBase);
      const trimmedKey = input.managementKey.trim();
      const previousDesktopBase = desktopClient ? await getDesktopBackendBase() : null;

      if (desktopClient) {
        await setDesktopBackendBase(normalizedBase);
      }

      apiClient.setConfig({
        apiBase: resolveRequestApiBase(normalizedBase),
        managementKey: trimmedKey,
      });

      try {
        await configApi.getConfig();
      } catch (error) {
        if (desktopClient) {
          await setDesktopBackendBase(previousDesktopBase ?? "");
        }
        apiClient.setConfig({
          apiBase: resolveRequestApiBase(previousDesktopBase ?? apiBase),
          managementKey,
        });
        throw error;
      }

      setApiBase(normalizedBase);
      setManagementKey(trimmedKey);
      setRememberPassword(input.rememberPassword);
      setIsAuthenticated(true);

      if (input.rememberPassword) {
        await writeAuthSnapshot({
          apiBase: normalizedBase,
          managementKey: trimmedKey,
          rememberPassword: true,
        });
      } else {
        await clearAuthSnapshot();
      }
    },
    [apiBase, desktopClient, managementKey, resolveRequestApiBase],
  );

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    apiClient.setConfig({
      apiBase: resolveRequestApiBase(apiBase),
      managementKey: "",
    });

    if (rememberPassword && managementKey.trim()) {
      setManagementKey(managementKey);
      return;
    }

    setManagementKey("");
    void clearAuthSnapshot();
  }, [apiBase, managementKey, rememberPassword, resolveRequestApiBase]);

  const replaceManagementKey = useCallback(
    (nextManagementKey: string) => {
      const trimmedKey = nextManagementKey.trim();
      setManagementKey(trimmedKey);
      apiClient.setConfig({
        apiBase: resolveRequestApiBase(apiBase),
        managementKey: trimmedKey,
      });

      if (rememberPassword && trimmedKey) {
        void writeAuthSnapshot({
          apiBase,
          managementKey: trimmedKey,
          rememberPassword: true,
        });
      } else {
        void clearAuthSnapshot();
      }
    },
    [apiBase, rememberPassword, resolveRequestApiBase],
  );

  const updateApiBase = useCallback(
    async (nextApiBase: string) => {
      const normalizedBase = normalizeApiBase(nextApiBase);
      const previousBase = apiBase;
      const previousDesktopBase = desktopClient ? await getDesktopBackendBase() : null;

      if (desktopClient) {
        await setDesktopBackendBase(normalizedBase);
      }

      apiClient.setConfig({
        apiBase: resolveRequestApiBase(normalizedBase),
        managementKey,
      });

      try {
        await configApi.getConfig();
      } catch (error) {
        if (desktopClient) {
          await setDesktopBackendBase(previousDesktopBase ?? previousBase);
        }
        apiClient.setConfig({
          apiBase: resolveRequestApiBase(previousBase),
          managementKey,
        });
        throw error;
      }

      setApiBase(normalizedBase);

      if (rememberPassword && managementKey.trim()) {
        await writeAuthSnapshot({
          apiBase: normalizedBase,
          managementKey,
          rememberPassword: true,
        });
      }
    },
    [apiBase, desktopClient, managementKey, rememberPassword, resolveRequestApiBase],
  );

  const restore = useCallback(async () => {
    setIsRestoring(true);
    await bootstrap();
  }, [bootstrap]);

  const value = useMemo<AuthContextState>(
    () => ({
      state: {
        isAuthenticated,
        isRestoring,
        apiBase,
        managementKey,
        rememberPassword,
        serverVersion,
        serverBuildDate,
      },
      actions: {
        login,
        logout,
        restore,
        replaceManagementKey,
        updateApiBase,
      },
      meta: {
        managementEndpoint: computeManagementApiBase(apiBase),
      },
    }),
    [
      isAuthenticated,
      isRestoring,
      apiBase,
      managementKey,
      rememberPassword,
      serverVersion,
      serverBuildDate,
      login,
      logout,
      restore,
      replaceManagementKey,
      updateApiBase,
    ],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export const useAuth = (): AuthContextState => {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const useOptionalAuth = (): AuthContextState | null => use(AuthContext);
