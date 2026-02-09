import { z } from "zod";

/**
 * Environment variable schema with comprehensive validation
 * Database: either DATABASE_URL (e.g. Supabase) or all POSTGRES_* (e.g. Docker).
 */
const envSchema = z
  .object({
    // Application environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development")
      .describe("Application environment"),

    // Server configuration
    PORT: z
      .union([z.string(), z.number()])
      .pipe(z.coerce.number().int().positive())
      .default(4000)
      .describe("Backend server port"),

    // Database: single URL (Supabase) or individual components (Docker)
    DATABASE_URL: z
      .string()
      .min(1)
      .optional()
      .describe("PostgreSQL connection URI (use for Supabase)"),

    POSTGRES_USER: z.string().min(1).optional().describe("PostgreSQL username"),
    POSTGRES_PASSWORD: z.string().min(1).optional().describe("PostgreSQL password"),
    POSTGRES_DB: z.string().min(1).optional().describe("PostgreSQL database name"),
    POSTGRES_HOST: z.string().min(1).optional().describe("PostgreSQL host address"),
    POSTGRES_PORT: z
      .union([z.string(), z.number()])
      .pipe(z.coerce.number().int().positive())
      .optional()
      .describe("PostgreSQL port number"),

  // JWT configuration
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long for security")
    .describe("JWT signing secret (minimum 32 characters)"),

  JWT_EXPIRY: z
    .string()
    .default("1d")
    .describe("JWT token expiration time (e.g., 1d, 24h, 3600s)"),

  // Logging configuration
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info")
    .describe("Logging level"),
  })
  .refine(
    (data) =>
      !!data.DATABASE_URL ||
      (!!data.POSTGRES_USER &&
        !!data.POSTGRES_PASSWORD &&
        !!data.POSTGRES_DB &&
        !!data.POSTGRES_HOST),
    {
      message:
        "Either DATABASE_URL or all of POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST must be set",
      path: ["DATABASE_URL"],
    }
  );

/**
 * Parse and validate environment variables
 */
function parseEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => {
        const issues = messages?.join(", ") || "Unknown error";
        return `  • ${field}: ${issues}`;
      })
      .join("\n");

    const errorOutput = `
╔════════════════════════════════════════════════════════════════╗
║                 ENVIRONMENT VALIDATION FAILED                  ║
╚════════════════════════════════════════════════════════════════╝

The following environment variables are invalid or missing:

${errorMessages}

Please ensure all required variables are set correctly.

Required variables:
  - NODE_ENV: "development" | "test" | "production"
  - PORT: positive integer (default: 4000)
  - Database: either DATABASE_URL (Supabase) or all of POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT
  - JWT_SECRET: minimum 32 characters (for security)
  - JWT_EXPIRY: valid duration string (default: "1d")
  - LOG_LEVEL: "debug" | "info" | "warn" | "error" (default: "info")
`;

    // eslint-disable-next-line no-console
    console.error(errorOutput);
    throw new Error("Environment validation failed");
  }

  return parsed.data;
}

// Parse environment variables immediately on module load
const rawEnv = parseEnv();

/**
 * Construct DATABASE_URL from individual PostgreSQL environment variables
 * Format: postgresql://user:password@host:port/database
 */
function buildUrlFromPostgres(env: {
  POSTGRES_USER?: string;
  POSTGRES_PASSWORD?: string;
  POSTGRES_HOST?: string;
  POSTGRES_PORT?: number;
  POSTGRES_DB?: string;
}): string {
  const port = env.POSTGRES_PORT ?? 5432;
  return `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${port}/${env.POSTGRES_DB}`;
}

function getDatabaseUrl(env: typeof rawEnv): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  return buildUrlFromPostgres(env);
}

/**
 * Final validated configuration object with derived values
 */
export const config = {
  // Environment
  nodeEnv: rawEnv.NODE_ENV,
  isDevelopment: rawEnv.NODE_ENV === "development",
  isTest: rawEnv.NODE_ENV === "test",
  isProduction: rawEnv.NODE_ENV === "production",

  // Server
  port: rawEnv.PORT,

  // Database
  database: {
    user: rawEnv.POSTGRES_USER,
    password: rawEnv.POSTGRES_PASSWORD,
    database: rawEnv.POSTGRES_DB,
    host: rawEnv.POSTGRES_HOST,
    port: rawEnv.POSTGRES_PORT ?? 5432,
    url: getDatabaseUrl(rawEnv),
  },

  // JWT
  jwt: {
    secret: rawEnv.JWT_SECRET,
    expiry: rawEnv.JWT_EXPIRY,
  },

  // Logging
  logLevel: rawEnv.LOG_LEVEL,
} as const;

// Ensure DATABASE_URL is available as environment variable for database module
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = config.database.url;
}

// Export for backwards compatibility
export const env = rawEnv;
export const DATABASE_URL = config.database.url;

// Type inference for strict TypeScript support
export type Config = typeof config;


