import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, UserPlus } from "lucide-react";
import { panelUsersApi, type PanelRole, type PanelUserRecord } from "@/lib/http/apis/panel-auth";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { TextInput } from "@/modules/ui/Input";
import { PageToolbar } from "@/modules/ui/PageToolbar";
import { Select } from "@/modules/ui/Select";
import { useToast } from "@/modules/ui/ToastProvider";

export function UsersPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [users, setUsers] = useState<PanelUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<PanelRole>("user");

  const roleOptions = useMemo(
    () => [
      { value: "admin", label: t("users.role_admin") },
      { value: "user", label: t("users.role_user") },
    ],
    [t],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await panelUsersApi.list();
      setUsers(response.users ?? []);
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
      await panelUsersApi.create({ username: username.trim(), password, role });
      setUsername("");
      setPassword("");
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
  }, [notify, password, refresh, role, t, username]);

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
        <div className="grid gap-3 md:grid-cols-4">
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
                  <th className="px-3 py-2">{t("users.column_role")}</th>
                  <th className="px-3 py-2">{t("users.column_status")}</th>
                  <th className="px-3 py-2">{t("users.column_last_login")}</th>
                  <th className="px-3 py-2">{t("users.column_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 dark:border-neutral-900">
                    <td className="px-3 py-2 font-medium">{user.username}</td>
                    <td className="px-3 py-2">{user.role === "admin" ? t("users.role_admin") : t("users.role_user")}</td>
                    <td className="px-3 py-2">
                      {user.disabled ? t("users.status_disabled") : t("users.status_active")}
                    </td>
                    <td className="px-3 py-2">{user.last_login_at || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
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
    </section>
  );
}
