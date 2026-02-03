import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.string().default("info"),
  MAX_JSON_BODY: z.string().default("500mb"),
  MAX_URLENCODED_BODY: z.string().default("500mb"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  FILE_TTL_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
  UPLOAD_DIR: z.string().optional(),
  MAX_PAYLOAD_MB: z.coerce.number().int().positive().default(100),
});

const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
  maxJsonBody: env.MAX_JSON_BODY,
  maxUrlEncodedBody: env.MAX_URLENCODED_BODY,
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  fileTtlMs: env.FILE_TTL_MS,
  uploadDir: env.UPLOAD_DIR,
  wsMaxPayloadBytes: env.MAX_PAYLOAD_MB * 1024 * 1024,
};

export const isProduction = env.NODE_ENV === "production";
