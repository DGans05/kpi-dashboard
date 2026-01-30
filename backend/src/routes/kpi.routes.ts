/**
 * KPI Routes
 * Express router for KPI entry endpoints
 */

import { Router } from 'express';
import * as kpiController from '../controllers/kpi.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

// GET /api/kpi/dashboard - Get dashboard summary (MUST be before /entries/:id)
router.get('/dashboard', authenticate, kpiController.getDashboardSummary);

// GET /api/kpi/aggregated - Get aggregated data (MUST be before /entries/:id)
router.get('/aggregated', authenticate, kpiController.getAggregatedData);

// GET /api/kpi/entries - Get all entries (filtered by user's access)
router.get('/entries', authenticate, kpiController.getEntries);

// GET /api/kpi/entries/:id - Get single entry by ID
router.get('/entries/:id', authenticate, kpiController.getEntryById);

// POST /api/kpi/entries - Create new entry (admin and manager only)
router.post(
  '/entries',
  authenticate,
  authorize(['admin', 'manager']),
  kpiController.createEntry
);

// PATCH /api/kpi/entries/:id - Update entry (admin and manager only)
router.patch(
  '/entries/:id',
  authenticate,
  authorize(['admin', 'manager']),
  kpiController.updateEntry
);

// DELETE /api/kpi/entries/:id - Delete entry (admin only)
router.delete(
  '/entries/:id',
  authenticate,
  authorize(['admin']),
  kpiController.deleteEntry
);

export { router };
