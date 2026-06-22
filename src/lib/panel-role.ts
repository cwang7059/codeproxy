import type { PanelRole } from "@/lib/http/apis/panel-auth";

const USER_ALLOWED_ROUTES = [
  "/dashboard",
  "/monitor",
  "/logs",
  "/models",
  "/api-keys",
  "/system",
] as const;

const ADMIN_ONLY_PREFIXES = [
  "/ai-providers",
  "/channel-groups",
  "/proxies",
  "/image-generation",
  "/auth-files",
  "/api-key-permissions",
  "/identity-fingerprint",
  "/config",
  "/users",
  "/settings",
  "/ccswitch-import-settings",
  "/manage/",
] as const;

export function isPanelAdmin(role: PanelRole | null | undefined): boolean {
  return role === "admin";
}

export function canAccessRoute(role: PanelRole | null | undefined, pathname: string): boolean {
  if (!role || isPanelAdmin(role)) {
    return true;
  }

  const path = pathname.split("?")[0] ?? pathname;
  if (ADMIN_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return false;
  }

  return USER_ALLOWED_ROUTES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function filterNavPath(role: PanelRole | null | undefined, path: string): boolean {
  return canAccessRoute(role, path);
}

export function panelRoleLabelKey(role: PanelRole | null | undefined): string {
  if (role === "user") {
    return "shell.role_user";
  }
  return "shell.role_admin";
}
