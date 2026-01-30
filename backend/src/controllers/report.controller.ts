/**
 * Report Controller
 * HTTP handlers for data export functionality
 */

import { Request, Response, NextFunction } from 'express';
import { kpiRepository } from '../repositories/kpi.repository';
import { logger } from '../config/logger';

/**
 * GET /api/reports/kpi/export
 * Export KPI data as CSV or JSON
 */
export async function exportKPIData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { restaurantId, startDate, endDate, format } = req.query;

    // Validate required params
    if (!startDate || !endDate) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'startDate and endDate are required',
      });
      return;
    }

    // For managers, force their restaurant ID
    let effectiveRestaurantId = restaurantId as string | undefined;
    if (req.user!.role === 'manager') {
      effectiveRestaurantId = req.user!.restaurantId || undefined;
    }

    // Get KPI entries
    const entries = await kpiRepository.findByRestaurantAndDateRange({
      restaurantId: effectiveRestaurantId,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    // Determine output format
    const outputFormat = (format as string)?.toLowerCase() || 'csv';

    if (outputFormat === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="kpi-export-${startDate}-to-${endDate}.json"`
      );
      res.json(entries);
      return;
    }

    // Default: CSV
    const headers = [
      'Date',
      'Restaurant',
      'Revenue',
      'Labour Cost',
      'Labour %',
      'Food Cost',
      'Food %',
      'Orders',
      'Avg Ticket',
    ];

    const rows = entries.map((entry) => [
      entry.entryDate,
      entry.restaurant?.name || 'Unknown',
      entry.revenue.toFixed(2),
      entry.labourCost.toFixed(2),
      entry.labourCostPercent.toFixed(1),
      entry.foodCost.toFixed(2),
      entry.foodCostPercent.toFixed(1),
      entry.orders.toString(),
      entry.avgTicket.toFixed(2),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const filename = `kpi-export-${startDate}-to-${endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error exporting KPI data', { error: message });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export KPI data',
    });
  }
}

/**
 * GET /api/reports/summary
 * Get summary report data
 */
export async function getSummaryReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { restaurantId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'startDate and endDate are required',
      });
      return;
    }

    // For managers, force their restaurant ID
    let effectiveRestaurantId = restaurantId as string | undefined;
    if (req.user!.role === 'manager') {
      if (!req.user!.restaurantId) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'No restaurant assigned',
        });
        return;
      }
      effectiveRestaurantId = req.user!.restaurantId;
    }

    if (!effectiveRestaurantId) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'restaurantId is required',
      });
      return;
    }

    const totals = await kpiRepository.getPeriodTotals(
      effectiveRestaurantId,
      startDate as string,
      endDate as string
    );

    if (!totals) {
      res.status(200).json({
        summary: {
          totalRevenue: 0,
          totalLabourCost: 0,
          totalFoodCost: 0,
          totalOrders: 0,
          avgTicket: 0,
          labourCostPercent: 0,
          foodCostPercent: 0,
        },
      });
      return;
    }

    res.status(200).json({ summary: totals });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error getting summary report', { error: message });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get summary report',
    });
  }
}
