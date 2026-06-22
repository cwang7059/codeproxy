import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/modules/auth/AuthProvider";
import { ProtectedRoute } from "@/app/guards/ProtectedRoute";
import { RoleRoute } from "@/app/guards/RoleRoute";
import { DashboardLayout } from "@/modules/layout/DashboardLayout";
import { ThemeProvider } from "@/modules/ui/ThemeProvider";
import { ToastProvider } from "@/modules/ui/ToastProvider";
import { DesktopFrame } from "@/modules/ui/DesktopFrame";
import { RouteViewport } from "@/modules/ui/RouteViewport";
import { AutoUpdatePrompt } from "@/modules/update/AutoUpdatePrompt";
import { CodexConnectPrompt } from "@/modules/system/CodexConnectPrompt";

// Lazy-loaded page components for route-level code splitting
const LoginPage = lazy(() =>
  import("@/modules/login/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import("@/modules/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const MonitorHubPage = lazy(() =>
  import("@/modules/monitor/MonitorHubPage").then((m) => ({ default: m.MonitorHubPage })),
);
const ProvidersPage = lazy(() =>
  import("@/modules/providers/ProvidersPage").then((m) => ({ default: m.ProvidersPage })),
);
const AuthFilesPage = lazy(() =>
  import("@/modules/auth-files/AuthFilesPage").then((m) => ({ default: m.AuthFilesPage })),
);
const ConfigPage = lazy(() =>
  import("@/modules/config/ConfigPage").then((m) => ({ default: m.ConfigPage })),
);
const LogsPage = lazy(() =>
  import("@/modules/logs/LogsPage").then((m) => ({ default: m.LogsPage })),
);
const SystemPage = lazy(() =>
  import("@/modules/system/SystemPage").then((m) => ({ default: m.SystemPage })),
);
const ApiKeysPage = lazy(() =>
  import("@/modules/api-keys/ApiKeysPage").then((m) => ({ default: m.ApiKeysPage })),
);
const ApiKeyPermissionsPage = lazy(() =>
  import("@/modules/api-key-permissions/ApiKeyPermissionsPage").then((m) => ({
    default: m.ApiKeyPermissionsPage,
  })),
);
const ChannelGroupsPage = lazy(() =>
  import("@/modules/channel-groups/ChannelGroupsPage").then((m) => ({
    default: m.ChannelGroupsPage,
  })),
);
const IdentityFingerprintPage = lazy(() =>
  import("@/modules/identity-fingerprint/IdentityFingerprintPage").then((m) => ({
    default: m.IdentityFingerprintPage,
  })),
);
const ModelsPage = lazy(() =>
  import("@/modules/models/ModelsPage").then((m) => ({ default: m.ModelsPage })),
);
const ProxiesPage = lazy(() =>
  import("@/modules/proxies/ProxiesPage").then((m) => ({ default: m.ProxiesPage })),
);
const ApiKeyLookupPage = lazy(() =>
  import("@/modules/apikey-lookup/ApiKeyLookupPage").then((m) => ({ default: m.ApiKeyLookupPage })),
);
const UsersPage = lazy(() =>
  import("@/modules/users/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const ImageGenerationPage = lazy(() =>
  import("@/modules/image-generation/ImageGenerationPage").then((m) => ({
    default: m.ImageGenerationPage,
  })),
);

export function AppRouter() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DesktopFrame>
          <div className="flex h-full min-h-0 flex-1 flex-col font-sans antialiased">
          <Suspense>
            <Routes>
              {/* Public page – outside AuthProvider to avoid triggering /management/config */}
              <Route path="/apikey-lookup" element={<RouteViewport><ApiKeyLookupPage /></RouteViewport>} />

              {/* Everything else requires AuthProvider for session management */}
              <Route
                path="*"
                element={
                  <AuthProvider>
                    <RouteViewport>
                      <AutoUpdatePrompt />
                      <CodexConnectPrompt />
                      <Suspense>
                        <Routes>
                          <Route path="/login" element={<LoginPage />} />
                        <Route element={<ProtectedRoute />}>
                          <Route element={<DashboardLayout />}>
                            <Route element={<RoleRoute />}>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/monitor" element={<MonitorHubPage />} />
                            <Route path="/monitor/request-logs" element={<MonitorHubPage />} />
                            <Route path="/ai-providers" element={<ProvidersPage />} />
                            <Route path="/ai-providers/*" element={<ProvidersPage />} />
                            <Route path="/auth-files" element={<AuthFilesPage />} />
                            <Route
                              path="/auth-files/oauth-excluded"
                              element={<Navigate to="/auth-files?tab=excluded" replace />}
                            />
                            <Route
                              path="/auth-files/oauth-model-alias"
                              element={<Navigate to="/auth-files?tab=alias" replace />}
                            />
                            <Route path="/usage" element={<Navigate to="/monitor" replace />} />
                            <Route path="/users" element={<UsersPage />} />
                            <Route path="/config" element={<ConfigPage />} />
                            <Route path="/logs" element={<LogsPage />} />
                            <Route path="/system" element={<SystemPage />} />
                            <Route path="/settings" element={<Navigate to="/config" replace />} />
                            <Route path="/api-keys" element={<ApiKeysPage />} />
                            <Route
                              path="/api-key-permissions"
                              element={<ApiKeyPermissionsPage />}
                            />
                            <Route
                              path="/manage/api-key-permissions"
                              element={<Navigate to="/api-key-permissions" replace />}
                            />
                            <Route
                              path="/ccswitch-import-settings"
                              element={<Navigate to="/api-keys?tab=ccswitch-import" replace />}
                            />
                            <Route
                              path="/manage/ccswitch-import-settings"
                              element={<Navigate to="/api-keys?tab=ccswitch-import" replace />}
                            />
                            <Route path="/image-generation" element={<ImageGenerationPage />} />
                            <Route path="/channel-groups" element={<ChannelGroupsPage />} />
                            <Route
                              path="/identity-fingerprint"
                              element={<IdentityFingerprintPage />}
                            />
                            <Route
                              path="/manage/identity-fingerprint"
                              element={<Navigate to="/identity-fingerprint" replace />}
                            />
                            <Route path="/models" element={<ModelsPage />} />
                            <Route path="/proxies" element={<ProxiesPage />} />
                            <Route
                              path="/manage/proxies"
                              element={<Navigate to="/proxies" replace />}
                            />
                            <Route
                              path="/manage/models"
                              element={<Navigate to="/models" replace />}
                            />
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            </Route>
                          </Route>
                        </Route>
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </Suspense>
                    </RouteViewport>
                  </AuthProvider>
                }
              />
            </Routes>
          </Suspense>
          </div>
        </DesktopFrame>
      </ToastProvider>
    </ThemeProvider>
  );
}
