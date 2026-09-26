import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL harus berupa URL PostgreSQL yang valid'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().url('CLIENT_ORIGIN harus berupa URL yang valid').default('http://localhost:5174'),
  BOOTSTRAP_TOKEN: z.string().min(24).optional(),
  REGISTRATION_INVITE_CODE: z.string().min(16).optional(),
  PORT: z.coerce.number().int().positive().default(4001),
  // Cookie CSRF hanya ditandai "secure" (harus HTTPS) bila aplikasi diakses lewat HTTPS.
  // Set CSRF_SECURE=false saat memakai plain HTTP di IP VM, jika tidak browser menolak cookie.
  CSRF_SECURE: z.enum(['true', 'false']).default('true'),
});

export const config = envSchema.parse(process.env);