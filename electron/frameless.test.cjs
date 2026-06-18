const test = require("node:test");
const assert = require("node:assert/strict");

const { isFramelessWindowEnabled } = require("./frameless.cjs");

test("frameless defaults to enabled", () => {
  const previous = process.env.CODE_PROXY_FRAMELESS;
  delete process.env.CODE_PROXY_FRAMELESS;
  assert.equal(isFramelessWindowEnabled(), true);
  process.env.CODE_PROXY_FRAMELESS = previous;
});

test("frameless can be disabled explicitly", () => {
  const previous = process.env.CODE_PROXY_FRAMELESS;
  process.env.CODE_PROXY_FRAMELESS = "0";
  assert.equal(isFramelessWindowEnabled(), false);
  process.env.CODE_PROXY_FRAMELESS = previous;
});
