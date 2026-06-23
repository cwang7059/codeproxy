import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, RefreshCw } from "lucide-react";
import { apiKeyEntriesApi, type ApiKeyEntry } from "@/lib/http/apis/api-keys";
import { panelUsersApi, type PanelRole, type PanelUserRecord } from "@/lib/http/apis/panel-auth";
import { maskApiKey } from "@/lib/mask-api-key";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { TextInput } from "@/modules/ui/Input";
import { Modal } from "@/modules/ui/Modal";
import { PageToolbar } from "@/modules/ui/PageToolbar";
import { SearchableCheckboxMultiSelect } from "@/modules/ui/SearchableCheckboxMultiSelect";
import { Select } from "@/modules/ui/Select";
import { useToast } from "@/modules/ui/ToastProvider";

export function UsersPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [users, setUsers] = useState<PanelUserRecord[]>([]);
  const [apiKeyEntries, setApiKeyEntries] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<PanelRole>("user");
  const [bindingUser, setBindingUser] = useState<PanelUserRecord | null>(null);
  const [bindingKeys, setBindingKeys] = useState<string[]>([]);
  const [bindingSaving, setBindingSaving] = useState(false);

  const roleOptions = useMemo(
    () => [
      { value: "admin", label: t("users.role_admin") },
      { value: "user", label: t("users.role_user") },
    ],
    [t],
  );

  const apiKeyOptions = useMemo(
    () =>
      apiKeyEntries
        .filter((entry) => !entry.disabled && String(entry.key ?? "").trim())
        .map((entry) => {
          const key = String(entry.key).trim();
          const name = entry.name?.trim() || "";
          return {
            value: key,
            label: name ? `${name} (${maskApiKey(key)})` : maskApiKey(key),
            searchText: `${name} ${key}`,
          };
        }),
    [apiKeyEntries],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, entries] = await Promise.all([
        panelUsersApi.list(),
        apiKeyEntriesApi.list(),
      ]);
      setUsers(usersResponse.users ?? []);
      setApiKeyEntries(entries);
    } catch (error) {
      notify({
        type: "error",
        message: error instanceof Error ? error.message : t("users.load_failed"),
      });
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      notify({ type: "error", message: t("users.create_required") });
      return;
    }
    setCreating(true);
    try {
      await panelUsersApi.create({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        display_name: displayName.trim() || undefined,
        role,
      });
      setUsername("");
      setPassword("");
      setEmail("");
      setDisplayName("");
      setRole("user");
      notify({ type: "success", message: t("users.create_success") });
      await refresh();
    } catch (error) {
      notify({
        type: "error",
        message: error instanceof Error ? error.message : t("users.create_failed"),
      });
    } finally {
      setCreating(false);
    }
  }, [displayName, email, notify, password, refresh, role, t, username]);

  const handleToggleDisabled = useCallback(
    async (user: PanelUserRecord) => {
      try {
        await panelUsersApi.update(user.id, { role: user.role, disabled: !user.disabled });
        notify({ type: "success", message: t("users.update_success") });
        await refresh();
      } catch (error) {
        notify({
          type: "error",
          message: error instanceof Error ? error.message : t("users.update_failed"),
        });
      }
    },
    [notify, refresh, t],
  );

  const handleResetPassword = useCallback(
    async (user: PanelUserRecord) => {
      const nextPassword = window.prompt(t("users.reset_password_prompt", { username: user.username }));
      if (!nextPassword?.trim()) {
        return;
      }
      try {
        await panelUsersApi.resetPassword(user.id, nextPassword.trim());
        notify({ type: "success", message: t("users.reset_success") });
      } catch (error) {
        notify({
          type: "error",
          message: error instanceof Error ? error.message : t("users.reset_failed"),
        });
      }
    },
    [notify, t],
  );

  const openBindApiKeys = useCallback((user: PanelUserRecord) => {
    setBindingUser(user);
    setBindingKeys(user.api_key_ids ?? []);
  }, []);

  const closeBindApiKeys = useCallback(() => {
    if (bindingSaving) {
      return;
    }
    setBindingUser(null);
    setBindingKeys([]);
  }, [bindingSaving]);

  const handleSaveApiKeys = useCallback(async () => {
    if (!bindingUser) {
      return;
    }
    setBindingSaving(true);
    try {
      await panelUsersApi.setApiKeys(bindingUser.id, bindingKeys);
      notify({ type: "success", message: t("users.bind_api_keys_success") });
      setBindingUser(null);
      setBindingKeys([]);
      await refresh();
    } catch (error) {
      notify({
        type: "error",
        message: error instanceof Error ? error.message : t("users.bind_api_keys_failed"),
      });
    } finally {
      setBindingSaving(false);
    }
  }, [bindingKeys, bindingUser, notify, refresh, t]);

  return (
    <section className="page-stack">
      <PageToolbar
        title={t("users.title")}
        description={t("users.description")}
        actions={
          <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={14} />
            {t("common.refresh")}
          </Button>
        }
      />

      <Card title={t("users.create_title")}>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <TextInput
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder={t("users.username_placeholder")}
          />
          <TextInput
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("users.password_placeholder")}
          />
          <TextInput
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("users.email_placeholder")}
            autoComplete="email"
          />
          <TextInput
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t("users.display_name_placeholder")}
          />
          <Select value={role} onChange={(value) => setRole(value as PanelRole)} options={roleOptions} />
          <Button onClick={() => void handleCreate()} disabled={creating}>
            {t("users.create_action")}
          </Button>
        </div>
      </Card>

      <Card title={t("users.list_title")}>
        {loading ? (
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-slate-500">{t("users.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-neutral-800">
                  <th className="px-3 py-2">{t("users.column_username")}</th>
                  <th className="px-3 py-2">{t("users.column_email")}</th>
                  <th className="px-3 py-2">{t("users.column_display_name")}</th>
                  <th className="px-3 py-2">{t("users.column_role")}</th>
                  <th className="px-3 py-2">{t("users.column_api_keys")}</th>
                  <th className="px-3 py-2">{t("users.column_status")}</th>
                  <th className="px-3 py-2">{t("users.column_last_login")}</th>
                  <th className="px-3 py-2">{t("users.column_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 dark:border-neutral-900">
                    <td className="px-3 py-2 font-medium">{user.username}</td>
                    <td className="px-3 py-2">{user.email || "-"}</td>
                    <td className="px-3 py-2">{user.display_name || "-"}</td>
                    <td className="px-3 py-2">{user.role === "admin" ? t("users.role_admin") : t("users.role_user")}</td>
                    <td className="px-3 py-2">
                      {user.role === "admin"
                        ? t("users.api_keys_all")
                        : t("users.api_keys_count", { count: user.api_key_ids?.length ?? 0 })}
                    </td>
                    <td className="px-3 py-2">
                      {user.disabled ? t("users.status_disabled") : t("users.status_active")}
                    </td>
                    <td className="px-3 py-2">{user.last_login_at || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {user.role === "user" ? (
                          <Button size="sm" variant="secondary" onClick={() => openBindApiKeys(user)}>
                            <KeyRound size={13} />
                            {t("users.bind_api_keys")}
                          </Button>
                        ) : null}
                        <Button size="sm" variant="secondary" onClick={() => void handleResetPassword(user)}>
                          {t("users.reset_password")}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => void handleToggleDisabled(user)}>
                          {user.disabled ? t("users.enable") : t("users.disable")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={bindingUser !== null}
        title={t("users.bind_api_keys_title", { username: bindingUser?.username ?? "" })}
        description={t("users.bind_api_keys_desc")}
        onClose={closeBindApiKeys}
        footer={
          <>
            <Button variant="secondary" onClick={closeBindApiKeys} disabled={bindingSaving}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={() => void handleSaveApiKeys()} disabled={bindingSaving}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <SearchableCheckboxMultiSelect
          value={bindingKeys}
          onChange={setBindingKeys}
          options={apiKeyOptions}
          placeholder={t("users.bind_api_keys_placeholder")}
          searchPlaceholder={t("users.bind_search")}
          selectFilteredLabel={t("users.bind_select_filtered")}
          deselectFilteredLabel={t("users.bind_deselect_filtered")}
          selectedCountLabel={(count) => t("users.bind_api_keys_selected", { count })}
          noResultsLabel={t("users.bind_no_results")}
          aria-label={t("users.bind_api_keys")}
        />
      </Modal>
    </section>
  );
}
