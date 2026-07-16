import { z } from "zod";

const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).default(isNextBuild ? "postgres://campaign:campaign@localhost:5432/campaign_mailer" : ""),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().default("Mail Ninja"),
  APP_TIMEZONE: z.string().default("UTC"),
  SESSION_SECRET: z.string().min(32).default("development-session-secret-change-me-32"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  INITIAL_ADMIN_EMAIL: z.string().email().optional(),
  INITIAL_ADMIN_PASSWORD: z.string().min(12).optional(),
  INITIAL_ADMIN_NAME: z.string().default("Administrator"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  DEFAULT_FROM_NAME: z.string().default("Mail Ninja"),
  DEFAULT_FROM_EMAIL: z.string().email().optional(),
  DEFAULT_REPLY_TO: z.string().email().optional(),
  MAX_IMPORT_FILE_SIZE_MB: z.coerce.number().positive().default(10),
  MAX_IMPORT_ROWS: z.coerce.number().int().positive().default(50000),
  IMPORT_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  WORKER_ID: z.string().default(`worker-${process.pid}`),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  JOB_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  JOB_LOCK_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(15)
}).superRefine((value, ctx) => {
  if (!isNextBuild && !value.DATABASE_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["DATABASE_URL"], message: "DATABASE_URL is required." });
  }
  if (value.NODE_ENV === "production" && !isNextBuild && value.SESSION_SECRET.includes("development")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SESSION_SECRET"], message: "SESSION_SECRET must be changed in production." });
  }
});

export const env = envSchema.parse(process.env);
export const isSendingEnabled = Boolean(env.RESEND_API_KEY && env.DEFAULT_FROM_EMAIL);
