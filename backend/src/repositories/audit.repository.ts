/**
 * Audit Repository
 * Database operations for audit logging
 */

import { Request } from 'express';
import { query } from '../config/database';
import { logger } from '../config/logger';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

interface RawAuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string;
  user_full_name?: string;
}

function mapToAuditLog(row: RawAuditLog): AuditLog {
  const log: AuditLog = {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    changes: row.changes || {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };

  if (row.user_email) {
    log.user = {
      id: row.user_id,
      email: row.user_email,
      fullName: row.user_full_name || null,
    };
  }

  return log;
}

export interface AuditFilters {
  userId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Create audit log entry
 */
export async function create(data: {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const sql = `
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;

  const params = [
    data.userId,
    data.action,
    data.resourceType,
    data.resourceId,
    JSON.stringify(data.changes || {}),
    data.ipAddress || null,
    data.userAgent || null,
  ];

  try {
    await query(sql, params);
    logger.debug('Audit log created', {
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('AuditRepository: create failed', { error: message, data });
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Find all audit logs with optional filters
 */
export async function findAll(filters: AuditFilters = {}): Promise<AuditLog[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (filters.userId) {
    conditions.push(`a.user_id = $${paramIndex}`);
    params.push(filters.userId);
    paramIndex++;
  }

  if (filters.resourceType) {
    conditions.push(`a.resource_type = $${paramIndex}`);
    params.push(filters.resourceType);
    paramIndex++;
  }

  if (filters.startDate) {
    conditions.push(`a.created_at >= $${paramIndex}`);
    params.push(filters.startDate);
    paramIndex++;
  }

  if (filters.endDate) {
    conditions.push(`a.created_at <= $${paramIndex}`);
    params.push(filters.endDate + 'T23:59:59.999Z');
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 100;

  const sql = `
    SELECT
      a.id,
      a.user_id,
      a.action,
      a.resource_type,
      a.resource_id,
      a.changes,
      a.ip_address,
      a.user_agent,
      a.created_at,
      u.email as user_email,
      u.full_name as user_full_name
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `;

  try {
    const result = await query(sql, params);
    return result.rows.map(mapToAuditLog);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('AuditRepository: findAll failed', { error: message, filters });
    throw error;
  }
}

/**
 * Find audit logs by resource
 */
export async function findByResource(
  resourceType: string,
  resourceId: string
): Promise<AuditLog[]> {
  const sql = `
    SELECT
      a.id,
      a.user_id,
      a.action,
      a.resource_type,
      a.resource_id,
      a.changes,
      a.ip_address,
      a.user_agent,
      a.created_at,
      u.email as user_email,
      u.full_name as user_full_name
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.resource_type = $1 AND a.resource_id = $2
    ORDER BY a.created_at DESC
  `;

  try {
    const result = await query(sql, [resourceType, resourceId]);
    return result.rows.map(mapToAuditLog);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('AuditRepository: findByResource failed', { error: message, resourceType, resourceId });
    throw error;
  }
}

/**
 * Helper function to log audit from controllers
 */
export async function logAudit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changes: Record<string, unknown>,
  req: Request
): Promise<void> {
  const ipAddress = req.ip || req.socket?.remoteAddress || null;
  const userAgent = req.get('user-agent') || null;

  await create({
    userId,
    action,
    resourceType,
    resourceId,
    changes,
    ipAddress,
    userAgent,
  });
}

export const auditRepository = {
  create,
  findAll,
  findByResource,
  logAudit,
};
