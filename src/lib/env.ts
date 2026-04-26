import { z } from "zod";

const booleanStringSchema = z.preprocess((value: unknown) => {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}, z.boolean());

const serverEnvSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: booleanStringSchema.default(false),
  MINIO_BUCKET: z.string().default("product-images"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADO_PAGO_PUBLIC_KEY: z.string().optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("NerdLingoLab <no-reply@nerdlingolab.com>"),
  SUPPORT_EMAIL: z.string().email().default("nerdlingolab@gmail.com"),
  SENTRY_DSN: z.string().optional()
});

export const env = serverEnvSchema.parse(process.env);
