import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error("Unhandled error", { err });
  res.status(500).json({ message: "Internal server error" });
}

