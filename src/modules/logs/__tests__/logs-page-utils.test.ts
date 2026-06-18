import { describe, expect, test } from "vitest";
import {
  computeLogLevelStats,
  readLoggingToFile,
  resolveLiveLogsEmptyKind,
} from "@/modules/logs/logs-page-utils";

describe("logs-page-utils", () => {
  test("computeLogLevelStats counts levels from parsed lines", () => {
    const stats = computeLogLevelStats([
      "[2026-01-01 12:00:00] [info] server started",
      "[2026-01-01 12:00:01] [warn] slow request",
      "[2026-01-01 12:00:02] [error] upstream failed",
      "[2026-01-01 12:00:03] [fatal] crash",
    ]);
    expect(stats).toEqual({ total: 4, info: 1, warn: 1, error: 2 });
  });

  test("readLoggingToFile reads snake_case and camelCase keys", () => {
    expect(readLoggingToFile({ "logging-to-file": true })).toBe(true);
    expect(readLoggingToFile({ loggingToFile: false })).toBe(false);
  });

  test("resolveLiveLogsEmptyKind distinguishes empty reasons", () => {
    expect(
      resolveLiveLogsEmptyKind({
        loading: true,
        loggingToFile: true,
        bufferCount: 0,
        filteredCount: 0,
      }),
    ).toBe("loading");
    expect(
      resolveLiveLogsEmptyKind({
        loading: false,
        loggingToFile: false,
        bufferCount: 0,
        filteredCount: 0,
      }),
    ).toBe("logging_disabled");
    expect(
      resolveLiveLogsEmptyKind({
        loading: false,
        loggingToFile: true,
        bufferCount: 0,
        filteredCount: 0,
      }),
    ).toBe("waiting");
    expect(
      resolveLiveLogsEmptyKind({
        loading: false,
        loggingToFile: true,
        bufferCount: 12,
        filteredCount: 0,
      }),
    ).toBe("filtered");
    expect(
      resolveLiveLogsEmptyKind({
        loading: false,
        loggingToFile: true,
        bufferCount: 3,
        filteredCount: 2,
      }),
    ).toBeNull();
  });
});
