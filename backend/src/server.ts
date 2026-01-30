import dotenv from "dotenv";
dotenv.config();

// Validate environment variables immediately on startup (before imports)
import { config, logger } from "./config/logger";
import { initializePool, testConnection, closePool } from "./config/database";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { requestLogger } from "./middleware/request-logger";
import { errorHandler } from "./middleware/error-handler";
import { router as healthRouter } from "./routes/health.routes";
import { router as authRouter } from "./routes/auth.routes";
import { router as kpiRouter } from "./routes/kpi.routes";
import { router as userRouter } from "./routes/user.routes";
import { router as restaurantRouter } from "./routes/restaurant.routes";
import { router as auditRouter } from "./routes/audit.routes";
import { router as reportRouter } from "./routes/report.routes";

const app = express();

// ============================================================================
// Body and Cookie Parsing Middleware (MUST come before CORS)
// ============================================================================
app.use(express.json());
app.use(cookieParser());

// ============================================================================
// CORS Configuration - Allow credentials and specific origin for frontend
// IMPORTANT: Must come AFTER body-parser and cookie-parser
// ============================================================================
const corsOptions: cors.CorsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true, // Allow cookies to be sent with requests
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 hours
};

// Log CORS configuration on startup
logger.info("CORS configured", { origin: corsOptions.origin, credentials: corsOptions.credentials });

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options("*", cors(corsOptions));

// ============================================================================
// Request Logging Middleware
// ============================================================================
app.use(requestLogger);

// ============================================================================
// Routes
// ============================================================================
app.use("/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/kpi", kpiRouter);
app.use("/api/users", userRouter);
app.use("/api/restaurants", restaurantRouter);
app.use("/api/audit", auditRouter);
app.use("/api/reports", reportRouter);

// ============================================================================
// Global Error Handler Middleware - Must be last
// ============================================================================
app.use(errorHandler);

/**
 * Start the server with database initialization
 */
async function start() {
  try {
    // ========== Environment Validation ==========
    logger.info("Environment Configuration", {
      nodeEnv: config.nodeEnv,
      port: config.port,
      databaseHost: config.database.host,
    });

    // ========== Database Connection ==========
    logger.info("Initializing database connection pool...");
    initializePool();
    logger.info("Database connection pool initialized");

    // Test database connection with retry logic
    let connected = false;
    let retries = 0;
    const maxRetries = 5;

    while (!connected && retries < maxRetries) {
      try {
        connected = await testConnection();
        if (connected) {
          logger.info("✓ Database connection successful");
          break;
        }
      } catch (error) {
        retries++;
        if (retries < maxRetries) {
          logger.warn(`Database connection failed, retrying... (${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }
    }

    if (!connected) {
      throw new Error("Failed to connect to database after multiple retries");
    }

    // ========== Start Express Server ==========
    const server = app.listen(config.port, () => {
      const timestamp = new Date().toISOString();
      
      logger.info("╔════════════════════════════════════════════════════════════════╗");
      logger.info("║                   🚀 SERVER STARTED SUCCESSFULLY               ║");
      logger.info("╚════════════════════════════════════════════════════════════════╝");
      logger.info(`
Backend server is running:
  ✓ Environment: ${config.nodeEnv}
  ✓ Port: ${config.port}
  ✓ URL: http://localhost:${config.port}
  ✓ Database: Connected
  ✓ Timestamp: ${timestamp}

Available Endpoints:
  • GET  /health               - Health check
  • POST /api/auth/login       - User login
  • POST /api/auth/logout      - User logout
  • GET  /api/auth/me          - Get current user
  • GET  /api/kpi/*            - KPI data endpoints
  • GET  /api/users/*          - User management (admin)
  • GET  /api/restaurants/*    - Restaurant management
  • GET  /api/audit/*          - Audit logs (admin)
  • GET  /api/reports/*        - Report exports

Database Connections: Initialized and tested
Authentication: JWT + httpOnly cookies enabled
CORS: Configured for ${corsOptions.origin}
      `);
    });

    // ========== Graceful Shutdown ==========
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      server.close(async () => {
        logger.info("Server closed, closing database connections...");
        await closePool();
        logger.info("Database connections closed, exiting process");
        process.exit(0);
      });
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, shutting down gracefully...");
      server.close(async () => {
        logger.info("Server closed, closing database connections...");
        await closePool();
        logger.info("Database connections closed, exiting process");
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

start();

