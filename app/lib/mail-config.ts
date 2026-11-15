type Environment = Record<string, string | undefined>;

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("Invalid mail boolean configuration");
}

export function mailConfig(env: Environment = process.env) {
  if (!booleanValue(env.MAIL_ENABLED, false)) return null;
  const transport = env.MAIL_TRANSPORT || (env.NODE_ENV === "production" ? "smtp" : "mailtrap");
  if (transport !== "mailtrap" && transport !== "smtp") throw new Error("Invalid mail transport");
  const sandbox = transport === "mailtrap";
  const prefix = sandbox ? "MAILTRAP_SMTP" : "SMTP";
  const host = env[`${prefix}_HOST`]?.trim() || (sandbox ? "sandbox.smtp.mailtrap.io" : "localhost");
  const portValue = env[`${prefix}_PORT`] || (sandbox ? "2525" : "25");
  const port = Number(portValue);
  if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid SMTP port");
  const user = env[`${prefix}_USER`];
  const pass = env[`${prefix}_PASSWORD`];
  if ((!!user !== !!pass) || (sandbox && (!user || !pass))) throw new Error("Incomplete SMTP credentials");
  const from = env.MAIL_FROM_ADDRESS?.trim();
  const fromName = env.MAIL_FROM_NAME?.trim() || "Door List";
  if (!from || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from) || /[\r\n]/.test(fromName)) throw new Error("Invalid mail sender");
  const appUrl = new URL(env.APP_URL || (env.NODE_ENV === "production" ? "" : "http://localhost:3000"));
  if (!["http:", "https:"].includes(appUrl.protocol) || appUrl.username || appUrl.password || appUrl.pathname !== "/" || appUrl.search || appUrl.hash) throw new Error("APP_URL must be an HTTP origin");
  if (env.NODE_ENV === "production" && appUrl.protocol !== "https:") throw new Error("Production APP_URL must use HTTPS");

  return {
    origin: appUrl.origin,
    from: { name: fromName, address: from },
    smtp: {
      host, port,
      secure: booleanValue(env[`${prefix}_SECURE`], port === 465),
      requireTLS: booleanValue(env[`${prefix}_REQUIRE_TLS`], sandbox && port !== 465),
      ...(user && pass ? { auth: { user, pass } } : {}),
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    },
  };
}
