import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Copy, Eye, EyeOff, LoaderCircle, Lock } from "lucide-react";
import { detectApiBaseFromLocation, normalizeApiBase } from "@/lib/connection";
import { useAuth } from "@/modules/auth/AuthProvider";
import { useLoginConnectionProbe } from "@/modules/login/useLoginConnectionProbe";
import { Button } from "@/modules/ui/Button";
import { Checkbox } from "@/modules/ui/Checkbox";
import { TextInput } from "@/modules/ui/Input";
import { LanguageSelector } from "@/modules/ui/LanguageSelector";
import { PageBackground } from "@/modules/ui/PageBackground";
import { Reveal } from "@/modules/ui/Reveal";
import { ThemeToggleButton } from "@/modules/ui/ThemeProvider";
import { useToast } from "@/modules/ui/ToastProvider";
import { isDesktopFrameless, desktopWindowRegion } from "@/lib/desktop";
import { OpenAILogo, GeminiLogo, ClaudeLogo, VertexLogo } from "@/modules/dashboard/ProviderLogos";
import { DesktopWindowControls } from "@/modules/ui/DesktopWindowControls";
import { copyToClipboard } from "@/utils/clipboard";

interface RedirectState {
  from?: {
    pathname?: string;
  };
}

type FieldErrors = {
  apiBase?: string;
  managementKey?: string;
  form?: string;
};

const INPUT_SURFACE = "rounded-xl";
const INPUT_ERROR_RING =
  "ring-2 ring-rose-400/70 dark:ring-rose-400/45 focus-visible:ring-rose-400/70";

const PROVIDERS = [
  { key: "openai", label: "OpenAI", Logo: OpenAILogo, logoClassName: "" },
  { key: "gemini", label: "Gemini", Logo: GeminiLogo, logoClassName: "text-blue-500" },
  { key: "claude", label: "Claude", Logo: ClaudeLogo, logoClassName: "text-[#D97757]" },
  { key: "vertex", label: "Vertex", Logo: VertexLogo, logoClassName: "text-[#4285F4]" },
] as const;

function connectionStatusLabel(
  t: (key: string) => string,
  status: ReturnType<typeof useLoginConnectionProbe>,
) {
  switch (status) {
    case "checking":
      return t("login.connection_checking");
    case "reachable":
      return t("login.connection_reachable");
    case "unreachable":
      return t("login.connection_unreachable");
    case "invalid":
      return t("login.connection_invalid");
    default:
      return "";
  }
}

function connectionStatusClass(status: ReturnType<typeof useLoginConnectionProbe>) {
  switch (status) {
    case "checking":
      return "bg-amber-400 motion-safe:animate-pulse";
    case "reachable":
      return "bg-emerald-500";
    case "unreachable":
      return "bg-rose-500";
    case "invalid":
      return "bg-slate-300 dark:bg-white/25";
    default:
      return "bg-slate-300 dark:bg-white/20";
  }
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    state: {
      isAuthenticated,
      isRestoring,
      apiBase: persistedBase,
      managementKey: persistedKey,
      rememberPassword: persistedRemember,
    },
    actions: { login },
  } = useAuth();
  const { notify } = useToast();

  const currentAddress = useMemo(() => detectApiBaseFromLocation(), []);
  const defaultBase = useMemo(() => persistedBase || currentAddress, [currentAddress, persistedBase]);

  const [apiBase, setApiBase] = useState(defaultBase);
  const [managementKey, setManagementKey] = useState(persistedKey || "");
  const [rememberPassword, setRememberPassword] = useState(persistedRemember);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const managementKeyRef = useRef<HTMLInputElement>(null);
  const connectionStatus = useLoginConnectionProbe(apiBase);

  const managementEndpoint = useMemo(() => {
    const normalized = normalizeApiBase(apiBase);
    return normalized ? `${normalized}/v0/management` : "-";
  }, [apiBase]);

  const connectionHint = connectionStatusLabel(t, connectionStatus);

  useEffect(() => {
    managementKeyRef.current?.focus();
  }, []);


  const handleUseCurrentAddress = useCallback(() => {
    setApiBase(currentAddress);
    setFieldErrors((prev) => ({ ...prev, apiBase: undefined, form: undefined }));
    managementKeyRef.current?.focus();
  }, [currentAddress]);

  const handleCopyEndpoint = useCallback(async () => {
    if (managementEndpoint === "-") return;
    const copied = await copyToClipboard(managementEndpoint);
    notify({
      type: copied ? "success" : "error",
      message: copied ? t("login.copy_endpoint_success") : t("login.copy_endpoint_failed"),
    });
  }, [managementEndpoint, notify, t]);

  const mapSubmitError = useCallback(
    (message: string): FieldErrors => {
      const lowered = message.toLowerCase();
      if (
        lowered.includes("unauthorized") ||
        lowered.includes("invalid") ||
        lowered.includes("密钥") ||
        lowered.includes("key")
      ) {
        return { managementKey: message, form: message };
      }
      if (
        lowered.includes("network") ||
        lowered.includes("timeout") ||
        lowered.includes("not found") ||
        lowered.includes("地址")
      ) {
        return { apiBase: message, form: message };
      }
      return { form: message };
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFieldErrors({});

      if (!normalizeApiBase(apiBase)) {
        const message = t("login.error_required");
        setFieldErrors({ apiBase: message, form: message });
        notify({ type: "error", message });
        return;
      }

      if (!managementKey.trim()) {
        const message = t("login.error_management_key_required");
        setFieldErrors({ managementKey: message, form: message });
        notify({ type: "error", message });
        managementKeyRef.current?.focus();
        return;
      }

      setLoading(true);
      try {
        await login({
          apiBase,
          managementKey,
          rememberPassword,
        });
        notify({ type: "success", message: t("login.login_success") });
        const redirect = (location.state as RedirectState | null)?.from?.pathname ?? "/monitor";
        navigate(redirect, { replace: true, viewTransition: true });
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : t("login.error_invalid");
        const nextErrors = mapSubmitError(message);
        setFieldErrors(nextErrors);
        notify({ type: "error", message });
      } finally {
        setLoading(false);
      }
    },
    [
      apiBase,
      login,
      location.state,
      managementKey,
      mapSubmitError,
      navigate,
      notify,
      rememberPassword,
      t,
    ],
  );

  if (isRestoring) {
    return null;
  }

  if (isAuthenticated) {
    const redirect = (location.state as RedirectState | null)?.from?.pathname ?? "/monitor";
    return <Navigate to={redirect} replace />;
  }

  const topBarButtonClass =
    "inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-3 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white dark:border-neutral-800 dark:bg-neutral-950/60 dark:text-slate-200 dark:hover:bg-neutral-950/80";

  const frameless = isDesktopFrameless();

  return (
    <PageBackground variant="login" fill={frameless}>
      <div
        className={[
          "relative flex min-h-0 flex-1 flex-col",
        ]
          .filter(Boolean)
          .join(" ")}
        style={frameless ? desktopWindowRegion("no-drag") : undefined}
      >
        {frameless ? (
          <header
            className="sticky top-0 z-20 flex items-center gap-2 px-4 py-3 sm:px-6"
            onDoubleClick={() => void window.codeProxyDesktop?.toggleWindowMaximize?.()}
          >
            <div className="min-w-0 flex-1" style={desktopWindowRegion("drag")} aria-hidden="true" />
            <div className="flex shrink-0 items-center gap-2" style={desktopWindowRegion("no-drag")}>
              <LanguageSelector
                className={`${topBarButtonClass} min-w-[58px] gap-0.5 px-2.5`}
              />
              <ThemeToggleButton className={`${topBarButtonClass} w-10 px-0`} />
              <DesktopWindowControls variant="login" />
            </div>
          </header>
        ) : (
          <div className="absolute right-6 top-6 z-20 flex items-center gap-2">
            <LanguageSelector className={topBarButtonClass} />
            <ThemeToggleButton className={`${topBarButtonClass} w-10 px-0`} />
          </div>
        )}

        <div
          className={[
            "flex w-full min-h-0 flex-1 flex-col justify-center px-4 py-4 sm:px-6 sm:py-8",
            frameless ? "overflow-y-auto overscroll-contain" : "",
          ].join(" ")}
        >
          <Reveal className="mx-auto w-full max-w-5xl">
          <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
            <section className="order-1 w-full lg:order-2">
              <div className="rounded-2xl border border-slate-200/90 bg-white/92 p-6 text-slate-900 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.55)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/78 dark:text-slate-50 dark:shadow-[0_24px_60px_-48px_rgba(0,0,0,0.85)] sm:p-8">
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                      {t("login.sign_in")}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-white/55">
                      {t("login.continue_with_key")}
                    </p>
                  </div>

                  {fieldErrors.form ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
                    >
                      {fieldErrors.form}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <label className="block space-y-2">
                      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                        <span
                          className={`h-2 w-2 rounded-full ${connectionStatusClass(connectionStatus)}`}
                          aria-hidden="true"
                        />
                        <span>{t("login.connection_title")}</span>
                        {connectionHint ? (
                          <span className="normal-case tracking-normal text-slate-400 dark:text-white/40">
                            · {connectionHint}
                          </span>
                        ) : null}
                      </span>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <TextInput
                          value={apiBase}
                          onChange={(event) => {
                            setApiBase(event.target.value);
                            setFieldErrors((prev) => ({
                              ...prev,
                              apiBase: undefined,
                              form: undefined,
                            }));
                          }}
                          placeholder={t("login.custom_connection_placeholder")}
                          autoComplete="url"
                          aria-invalid={Boolean(fieldErrors.apiBase)}
                          className={`${INPUT_SURFACE} px-4 py-3 ${fieldErrors.apiBase ? INPUT_ERROR_RING : ""}`}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={handleUseCurrentAddress}
                        >
                          {t("login.use_current_address")}
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-white/50">
                        <span>
                          {t("login.endpoint_label")}:{" "}
                          <span className="font-mono tabular-nums text-slate-700 dark:text-white/72">
                            {managementEndpoint}
                          </span>
                        </span>
                        {managementEndpoint !== "-" ? (
                          <button
                            type="button"
                            onClick={() => void handleCopyEndpoint()}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-white/65 dark:hover:bg-white/5"
                          >
                            <Copy size={12} aria-hidden="true" />
                            {t("login.copy_endpoint")}
                          </button>
                        ) : null}
                      </div>
                      {fieldErrors.apiBase ? (
                        <p className="text-xs text-rose-600 dark:text-rose-300">
                          {fieldErrors.apiBase}
                        </p>
                      ) : null}
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                        {t("login.management_key_label")}
                      </span>
                      <TextInput
                        ref={managementKeyRef}
                        value={managementKey}
                        onChange={(event) => {
                          setManagementKey(event.target.value);
                          setFieldErrors((prev) => ({
                            ...prev,
                            managementKey: undefined,
                            form: undefined,
                          }));
                        }}
                        type={showKey ? "text" : "password"}
                        placeholder={t("login.placeholder")}
                        autoComplete="current-password"
                        aria-invalid={Boolean(fieldErrors.managementKey)}
                        className={`${INPUT_SURFACE} px-4 py-3 ${fieldErrors.managementKey ? INPUT_ERROR_RING : ""}`}
                        endAdornment={
                          <button
                            type="button"
                            onClick={() => setShowKey((value) => !value)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label={showKey ? t("login.hide_key") : t("login.show_key")}
                          >
                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        }
                      />
                      {fieldErrors.managementKey ? (
                        <p className="text-xs text-rose-600 dark:text-rose-300">
                          {fieldErrors.managementKey}
                        </p>
                      ) : null}
                    </label>

                    <div className="space-y-1">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-white/70">
                        <Checkbox
                          checked={rememberPassword}
                          onCheckedChange={setRememberPassword}
                          aria-label={t("login.remember_password_label")}
                        />
                        {t("login.remember_password_label")}
                      </label>
                      <p className="pl-6 text-xs text-slate-500 dark:text-white/45">
                        {t("login.remember_password_hint")}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={loading}
                      aria-busy={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <LoaderCircle
                          size={16}
                          className="motion-reduce:animate-none motion-safe:animate-spin"
                          aria-hidden="true"
                        />
                      ) : null}
                      {loading ? t("login.signing_in") : t("login.submit_button")}
                    </Button>
                  </form>
                </div>
              </div>
            </section>

            <aside className="order-2 flex w-full flex-col items-center space-y-8 text-center lg:order-1 lg:items-start lg:space-y-10 lg:text-left">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-slate-200 backdrop-blur dark:bg-neutral-950/60 dark:ring-neutral-800">
                  <Lock size={18} className="text-slate-900 dark:text-white" />
                </div>
                <div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  Code Proxy
                </div>
              </div>

              <div className="hidden max-w-md space-y-4 sm:block lg:max-w-none lg:space-y-6">
                <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 lg:text-5xl dark:text-white">
                  {t("login.hero_title_line1")}
                  <br />
                  {t("login.hero_title_line2")}
                </h1>
                <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-white/70">
                  {t("login.hero_description")}
                </p>
              </div>

              <div className="w-full space-y-3">
                <div className="text-xs font-semibold tracking-[0.22em] text-slate-500 dark:text-white/50">
                  {t("login.trusted_by")}
                </div>
                <div className="hidden flex-wrap justify-center gap-3 sm:flex lg:justify-start">
                  {PROVIDERS.map(({ key, label, Logo, logoClassName }) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-200 backdrop-blur dark:bg-neutral-950/50 dark:text-white/80 dark:ring-white/10"
                    >
                      <Logo size={16} className={logoClassName} />
                      {label}
                    </span>
                  ))}
                </div>
                <div className="flex justify-center gap-2 sm:hidden">
                  {PROVIDERS.map(({ key, label, Logo, logoClassName }) => (
                    <span
                      key={key}
                      title={label}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/70 ring-1 ring-slate-200 backdrop-blur dark:bg-neutral-950/50 dark:ring-white/10"
                    >
                      <Logo size={16} className={logoClassName} aria-hidden="true" />
                      <span className="sr-only">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
          </Reveal>
        </div>
      </div>
    </PageBackground>
  );
}
