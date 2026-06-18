import { describe, expect, test } from "vitest";
import {
  formatHourAxisLabel,
  parseHourTimestamp,
  sortHourKeys,
} from "@/modules/monitor/monitor-hourly-utils";

describe("monitor-hourly-utils", () => {
  test("sorts hour keys chronologically across day boundaries", () => {
    const hours = [
      "2026-06-18 10:00",
      "2026-06-17 18:00",
      "2026-06-17 17:00",
      "2026-06-18 09:00",
    ];

    expect(sortHourKeys(hours)).toEqual([
      "2026-06-17 17:00",
      "2026-06-17 18:00",
      "2026-06-18 09:00",
      "2026-06-18 10:00",
    ]);
  });

  test("formats same-day labels as HH:mm and cross-day labels with month/day", () => {
    const now = new Date(2026, 5, 18, 12, 0);
    expect(formatHourAxisLabel("2026-06-18 15:00", now)).toBe("15:00");
    expect(formatHourAxisLabel("2026-06-17 18:00", now)).toBe("06/17 18:00");
  });

  test("parses hour timestamps", () => {
    const timestamp = parseHourTimestamp("2026-06-18 09:30");
    expect(new Date(timestamp).getHours()).toBe(9);
    expect(new Date(timestamp).getMinutes()).toBe(30);
  });
});
