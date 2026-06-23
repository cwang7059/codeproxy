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
  resolveClientManagementApiBase,
} from "@/lib/connection";
import { getDesktopBackendBase, isDesktopClient, setDesktopBackendBase } from "@/lib/desktop";
import { apiClient } from "@/lib/http/client";
import { panelAuthApi, type PanelRole } from "@/lib/http/apis/panel-auth";
import type { AuthSnapshot } from "@/lib/http/types";

const AUTH_PERSIST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface AuthContextState {
  state: {
    isAuthenticated: boolean;
    isRestoring: boolean;
    apiBase: string;
    sessionToken: string;
    username: string;
    role: PanelRole | null;
    rememberPassword: boolean;
    serverVersion: string | null;
    serverBuildDate: string | null;
    /** @deprecated legacy field for existing callers */
    managementKey: string;
  };
  actions: {
    login: (input: {
      apiBase: string;
      username: string;
      password: string;
      rememberPassword: boolean;
    }) => Promise<void>;
    logout: () => void;
    restore: () => Promise<void>;
    updateApiBase: (apiBase: string) => Promise<void>;
    /** @deprecated session auth does not rotate local management keys */
    replaceManagementKey: (managementKey: string) => void;
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
    const token = parsed.sessionToken ?? parsed.managementKey;
    if (!parsed.apiBase || !token) {
      return null;
    }
    return {
      apiBase: parsed.apiBase,
      sessionToken: token,
      username: parsed.username ?? "",
      role: parsed.role ?? "admin",
      rememberPassword: Boolean(parsed.rememberPassword),
      expiresAt: parsed.expiresAt,
    };
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
  const token = snapshot.sessionToken ?? snapshot.managementKey;
  if (!snapshot.apiBase || !token) {
    return null;
  }

  return {
    apiBase: normalizeApiBase(snapshot.apiBase),
    sessionToken: token,
    username: snapshot.username ?? "",
    role: snapshot.role ?? "admin",
    rememberPassword: Boolean(snapshot.rememberPassword),
  };
}

const readAuthSnapshot = async (): Promise<AuthSnapshot | null> => {
  if (isDesktopAuthStorageAvailable()) {
    try {
      const snapshot = await window.codeProxyDesktop?.readAuthSnapshot?.();
      const normalized = normalizePersistedAuthSnapshot(snapshot as Partial<PersistedAuthSnapshot>);
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
    await window.codeProxyDesktop?.writeAuthSnapshot?.(payload as never);
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
  const [sessionToken, setSessionToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<PanelRole | null>(null);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [serverBuildDate, setServerBuildDate] = useState<string | null>(null);

  const resolveRequestApiBase = useCallback(
    (targetApiBase: string) => resolveClientManagementApiBase(targetApiBase, desktopClient),
    [desktopClient],
  );

  const applySession = useCallback(
    async (next: {
      apiBase: string;
      sessionToken: string;
      username: string;
      role: PanelRole;
      rememberPassword: boolean;
    }) => {
      setApiBase(next.apiBase);
      setSessionToken(next.sessionToken);
      setUsername(next.username);
      setRole(next.role);
      setRememberPassword(next.rememberPassword);
      setIsAuthenticated(true);

      if (next.rememberPassword) {
        await writeAuthSnapshot({
          apiBase: next.apiBase,
          sessionToken: next.sessionToken,
          username: next.username,
          role: next.role,
          rememberPassword: true,
        });
      } else {
        await clearAuthSnapshot();
      }
    },
    [],
  );

  const bootstrap = useCallback(async () => {
    const desktopBase = desktopClient ? await getDesktopBackendBase() : null;
    const fallbackBase = desktopBase ?? detectApiBaseFromLocation();
    const snapshot = await readAuthSnapshot();

    const resolvedBase = snapshot?.apiBase ?? fallbackBase;
    const resolvedToken = snapshot?.sessionToken ?? "";
    const resolvedRemember = snapshot?.rememberPassword ?? false;

    setApiBase(resolvedBase);
    setSessionToken(resolvedToken);
    setUsername(snapshot?.username ?? "");
    setRole(snapshot?.role ?? null);
    setRememberPassword(resolvedRemember);

    apiClient.setConfig({
      apiBase: resolveRequestApiBase(resolvedBase),
      authToken: resolvedToken,
    });

    if (!resolvedToken) {
      setIsAuthenticated(false);
      setIsRestoring(false);
      return;
    }

    try {
      const me = await panelAuthApi.me();
      setUsername(me.username);
      setRole(me.role);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setSessionToken("");
      setRole(null);
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
      setSessionToken("");
      setRole(null);
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
    async (input: {
      apiBase: string;
      username: string;
      password: string;
      rememberPassword: boolean;
    }) => {
      const normalizedBase = normalizeApiBase(input.apiBase);
      const desktopBase = desktopClient ? await getDesktopBackendBase() : null;
      const targetBase = desktopClient
        ? normalizeApiBase(normalizedBase || desktopBase || "")
        : normalizedBase;
      const previousDesktopBase = desktopClient ? await getDesktopBackendBase() : null;

      if (desktopClient && targetBase) {
        const currentDesktopBase = normalizeApiBase(previousDesktopBase ?? "");
        if (currentDesktopBase !== targetBase) {
          await setDesktopBackendBase(targetBase);
        }
      }

      apiClient.setConfig({
        apiBase: resolveRequestApiBase(targetBase),
        authToken: "",
      });

      try {
        const response = await panelAuthApi.login({
          username: input.username.trim(),
          password: input.password,
        });

        apiClient.setConfig({
          apiBase: resolveRequestApiBase(targetBase),
          authToken: response.token,
        });

        await applySession({
          apiBase: targetBase,
          sessionToken: response.token,
          username: response.username,
          role: response.role,
          rememberPassword: input.rememberPassword,
        });
      } catch (error) {
        if (desktopClient) {
          await setDesktopBackendBase(previousDesktopBase ?? "");
        }
        apiClient.setConfig({
          apiBase: resolveRequestApiBase(previousDesktopBase ?? apiBase),
          authToken: sessionToken,
        });
        throw error;
      }
    },
    [apiBase, applySession, desktopClient, resolveRequestApiBase, sessionToken],
  );

  const logout = useCallback(() => {
    const token = sessionToken;
    setIsAuthenticated(false);
    setSessionToken("");
    setRole(null);
    apiClient.setConfig({
      apiBase: resolveRequestApiBase(apiBase),
      authToken: "",
    });

    if (token) {
      void panelAuthApi.logout().catch(() => undefined);
    }

    if (!rememberPassword) {
      setUsername("");
      void clearAuthSnapshot();
    }
  }, [apiBase, rememberPassword, resolveRequestApiBase, sessionToken]);

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
        authToken: sessionToken,
      });

      try {
        await panelAuthApi.me();
      } catch (error) {
        if (desktopClient) {
          await setDesktopBackendBase(previousDesktopBase ?? previousBase);
        }
        apiClient.setConfig({
          apiBase: resolveRequestApiBase(previousBase),
          authToken: sessionToken,
        });
        throw error;
      }

      setApiBase(normalizedBase);

      if (rememberPassword && sessionToken.trim()) {
        await writeAuthSnapshot({
          apiBase: normalizedBase,
          sessionToken,
          username,
          role: role ?? "user",
          rememberPassword: true,
        });
      }
    },
    [apiBase, desktopClient, rememberPassword, resolveRequestApiBase, role, sessionToken, username],
  );

  const replaceManagementKey = useCallback((_nextManagementKey: string) => {
    // Session-based auth keeps using the server-issued token; rotating the
    // remote management secret does not require updating the local snapshot.
  }, []);

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
        sessionToken,
        username,
        role,
        rememberPassword,
        serverVersion,
        serverBuildDate,
        managementKey: sessionToken,
      },
      actions: {
        login,
        logout,
        restore,
        updateApiBase,
        replaceManagementKey,
      },
      meta: {
        managementEndpoint: computeManagementApiBase(apiBase),
      },
    }),
    [
      isAuthenticated,
      isRestoring,
      apiBase,
      sessionToken,
      username,
      role,
      rememberPassword,
      serverVersion,
      serverBuildDate,
      login,
      logout,
      restore,
      updateApiBase,
      replaceManagementKey,
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
