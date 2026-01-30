/**
 * Audit Controller
 * HTTP handlers for audit log viewing
 */

import { Request, Response, NextFunction } from 'express';
import { auditRepository } from '../repositories/audit.repository';
import { logger } from '../config/logger';

/**
 * GET /api/audit
 * Get audit logs with optional filters (admin only)
 */
export async function getAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, resourceType, startDate, endDate, limit } = req.query;

    const logs = await auditRepository.findAll({
      userId: userId as string | undefined,
      resourceType: resourceType as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error fetching audit logs', { error: message });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch audit logs',
    });
  }
}

/**
 * GET /api/audit/:resourceType/:resourceId
 * Get audit history for specific resource (admin only)
 */
export async function getResourceAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { resourceType, resourceId } = req.params;

    const logs = await auditRepository.findByResource(resourceType, resourceId);

    res.status(200).json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error fetching resource audit logs', { error: message });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch audit logs',
    });
  }
}

/**
 * GET /api/audit/export
 * Export audit logs as CSV (admin only)
 */
export async function exportAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate, limit } = req.query;

    const logs = await auditRepository.findAll({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string) : 1000,
    });

    // Generate CSV
    const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Changes'];
    const rows = logs.map((log) => [
      log.createdAt,
      log.user?.email || log.userId,
      log.action,
      log.resourceType,
      log.resourceId,
      JSON.stringify(log.changes),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error exporting audit logs', { error: message });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export audit logs',
    });
  }
}
