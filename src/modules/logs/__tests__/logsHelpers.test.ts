import { describe, expect, test } from "vitest";
import { parseLogLine } from "@/modules/logs/logsHelpers";

describe("parseLogLine", () => {
  test("parses gin access logs without duplicating pipe payload in message", () => {
    const parsed = parseLogLine(
      '[2026-03-19 16:55:22] [INFO] [gin_logger.go:93] 200 | 124ms | 127.0.0.1 | GET "/v0/management/api-key-entries"',
    );

    expect(parsed).toMatchObject({
      timestamp: "2026-03-19 16:55:22",
      level: "info",
      source: "gin_logger.go:93",
      statusCode: 200,
      latency: "124ms",
      ip: "127.0.0.1",
      method: "GET",
      path: "/v0/management/api-key-entries",
      message: "",
    });
  });

  test("keeps free-form text logs in message", () => {
    const parsed = parseLogLine("[2026-03-19 16:55:22] [INFO] server started on :8317");

    expect(parsed).toMatchObject({
      level: "info",
      message: "server started on :8317",
    });
  });

  test("keeps unmatched pipe segments in message", () => {
    const parsed = parseLogLine("[2026-03-19 16:55:22] [WARN] upstream retry | attempt 2");

    expect(parsed).toMatchObject({
      level: "warn",
      message: "upstream retry | attempt 2",
    });
  });
});
