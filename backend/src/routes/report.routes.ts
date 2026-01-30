/**
 * Report Routes
 * Express router for report/export endpoints
 */

import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Export KPI data (any authenticated user, filtered by role)
router.get('/kpi/export', authenticate, reportController.exportKPIData);

// Summary report
router.get('/summary', authenticate, reportController.getSummaryReport);

export { router };
