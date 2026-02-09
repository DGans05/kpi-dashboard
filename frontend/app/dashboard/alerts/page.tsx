'use client';

import { useState } from 'react';
import { Plus, Bell, BellOff, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AlertsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Id<'restaurants'> | undefined>();

  const alertRules = useQuery(api.alerts.getAlertRules, {
    restaurantId: selectedRestaurant,
  });

  const alertHistory = useQuery(api.alerts.getAlertHistory, {
    restaurantId: selectedRestaurant,
    limit: 10,
  });

  const deleteAlertRule = useMutation(api.alerts.deleteAlertRule);
  const acknowledgeAlert = useMutation(api.alerts.acknowledgeAlert);

  const handleDeleteRule = async (ruleId: Id<'alert_rules'>) => {
    if (confirm('Are you sure you want to delete this alert rule?')) {
      await deleteAlertRule({ ruleId });
    }
  };

  const handleAcknowledgeAlert = async (alertId: Id<'alert_history'>) => {
    await acknowledgeAlert({ alertId });
  };

  const getMetricLabel = (metric: string) => {
    const labels: Record<string, string> = {
      labourCostPercent: 'Labour Cost %',
      foodCostPercent: 'Food Cost %',
      revenue: 'Revenue',
      orders: 'Orders',
    };
    return labels[metric] || metric;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Alert Rules
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Get notified when KPIs exceed thresholds
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Alert Rule
        </Button>
      </div>

      {/* Alert Rules */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Active Rules</h2>

        {!alertRules || alertRules.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No alert rules configured</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first alert rule to start monitoring KPIs
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)} className="mt-4">
              Create Alert Rule
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertRules.map((rule) => (
              <Card key={rule._id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {rule.enabled ? (
                        <Bell className="h-4 w-4 text-success" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="font-semibold text-foreground">
                        {getMetricLabel(rule.metric)}
                      </h3>
                      <Badge variant={rule.severity === 'critical' ? 'destructive' : 'warning'}>
                        {rule.severity}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      Alert when {rule.operator.replace('_', ' ')} {rule.threshold}
                      {rule.metric.includes('Percent') ? '%' : ''}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {rule.notifyEmail && (
                        <span>📧 Email ({rule.recipients.length})</span>
                      )}
                      {rule.notifySms && <span>📱 SMS</span>}
                      <span>🕐 Cooldown: {rule.cooldownMinutes}m</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition touch-manipulation"
                      title="Edit rule"
                      aria-label="Edit rule"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule._id)}
                      className="rounded-md p-2 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition touch-manipulation"
                      title="Delete rule"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Alerts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Recent Alerts</h2>

        {!alertHistory || alertHistory.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No alerts triggered yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {alertHistory.map((alert) => (
              <Card
                key={alert._id}
                className={cn(
                  'p-4 transition-colors',
                  alert.acknowledged ? 'opacity-60' : ''
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'warning'}>
                        {alert.severity}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {getMetricLabel(alert.metric)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {alert.message}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {new Date(alert._creationTime).toLocaleString()}
                      </span>
                      {alert.acknowledged && (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle className="h-3 w-3" />
                          Acknowledged by {alert.acknowledgedBy}
                        </span>
                      )}
                    </div>
                  </div>

                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledgeAlert(alert._id)}
                      className="touch-manipulation"
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Alert Modal - TODO: Implement */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Create Alert Rule
            </h2>
            <p className="text-sm text-muted-foreground">
              Alert creation form coming soon...
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(false)}
              className="mt-4"
            >
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
