export const DASHBOARD_RANGES = [1, 7, 30, 365, 1095] as const;
export const PRIMARY_DASHBOARD_RANGES = [1, 7, 30] as const;
export const EXTENDED_DASHBOARD_RANGES = [365, 1095] as const;

export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export const RANGE_KEYS: Record<DashboardRange, string> = {
  1: "dashboard.today",
  7: "dashboard.last_7_days",
  30: "dashboard.last_30_days",
  365: "dashboard.last_365_days",
  1095: "dashboard.last_1095_days",
};

export const PANEL_SURFACE =
  "rounded-[16px] border border-slate-200/85 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-neutral-950/85";
