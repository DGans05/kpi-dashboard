/**
 * Audit Routes
 * Express router for audit log endpoints
 */

import { Router } from 'express';
import * as auditController from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// All audit routes are admin-only
router.get('/', authenticate, authorize(['admin']), auditController.getAuditLogs);
router.get('/export', authenticate, authorize(['admin']), auditController.exportAuditLogs);
router.get('/:resourceType/:resourceId', authenticate, authorize(['admin']), auditController.getResourceAuditLogs);

export { router };
