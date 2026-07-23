type LogContext = Record<string, unknown>;

function write(
  level: "info" | "warn" | "error",
  message: string,
  context: LogContext = {},
) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...context,
  };
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const logger = {
  info: (message: string, context?: LogContext) =>
    write("info", message, context),
  warn: (message: string, context?: LogContext) =>
    write("warn", message, context),
  error: (message: string, context?: LogContext) =>
    write("error", message, context),
};
