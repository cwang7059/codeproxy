function parseFramelessEnv(raw) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "0" || value === "false" || value === "no") {
    return false;
  }
  if (value === "1" || value === "true" || value === "yes") {
    return true;
  }
  return null;
}

function isFramelessWindowEnabled() {
  const parsed = parseFramelessEnv(process.env.CODE_PROXY_FRAMELESS);
  return parsed ?? true;
}

module.exports = {
  isFramelessWindowEnabled,
};
