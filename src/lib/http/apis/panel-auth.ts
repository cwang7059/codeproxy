import { apiClient } from "@/lib/http/client";
import { MANAGEMENT_API_PREFIX } from "@/lib/constants";

export type PanelRole = "admin" | "user";

export interface PanelLoginResponse {
  token: string;
  role: PanelRole;
  username: string;
  expires_at: string;
}

export interface PanelMeResponse {
  username: string;
  role: PanelRole;
  user_id?: string;
  auth_mode?: string;
  permissions: string[];
}

export interface PanelUserRecord {
  id: string;
  username: string;
  role: PanelRole;
  disabled: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  api_key_ids?: string[];
}

export const panelAuthApi = {
  login(input: { username: string; password: string }) {
    return apiClient.post<PanelLoginResponse>(`${MANAGEMENT_API_PREFIX}/auth/login`, input, {
      timeoutMs: 15_000,
    });
  },

  logout() {
    return apiClient.post<{ status: string }>(`${MANAGEMENT_API_PREFIX}/auth/logout`);
  },

  me() {
    return apiClient.get<PanelMeResponse>(`${MANAGEMENT_API_PREFIX}/auth/me`);
  },

  changePassword(input: { current_password: string; new_password: string }) {
    return apiClient.put<{ status: string }>(`${MANAGEMENT_API_PREFIX}/auth/password`, input);
  },
};

export const panelUsersApi = {
  list() {
    return apiClient.get<{ users: PanelUserRecord[] }>(`${MANAGEMENT_API_PREFIX}/users`);
  },

  create(input: {
    username: string;
    password: string;
    role: PanelRole;
    api_key_ids?: string[];
  }) {
    return apiClient.post<PanelUserRecord>(`${MANAGEMENT_API_PREFIX}/users`, input);
  },

  update(id: string, input: { role: PanelRole; disabled: boolean }) {
    return apiClient.put<PanelUserRecord>(`${MANAGEMENT_API_PREFIX}/users/${encodeURIComponent(id)}`, input);
  },

  remove(id: string) {
    return apiClient.delete<{ status: string }>(
      `${MANAGEMENT_API_PREFIX}/users/${encodeURIComponent(id)}`,
    );
  },

  resetPassword(id: string, password: string) {
    return apiClient.post<{ status: string }>(
      `${MANAGEMENT_API_PREFIX}/users/${encodeURIComponent(id)}/reset-password`,
      { password },
    );
  },

  setApiKeys(id: string, api_key_ids: string[]) {
    return apiClient.put<PanelUserRecord>(
      `${MANAGEMENT_API_PREFIX}/users/${encodeURIComponent(id)}/api-keys`,
      { api_key_ids },
    );
  },
};
