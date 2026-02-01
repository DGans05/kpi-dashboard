'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils/formatters';

interface ChartDataPoint {
  date: string;
  revenue?: number;
  labourCost?: number;
  foodCost?: number;
  orders?: number;
  labourCostPercent?: number;
  foodCostPercent?: number;
  [key: string]: string | number | undefined;
}

interface KPIChartProps {
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'area';
  dataKeys: string[];
  title?: string;
  height?: number;
  yAxisFormatter?: (value: number) => string;
}

// Theme-aware colors using CSS variables
const COLORS: Record<string, string> = {
  revenue: 'hsl(var(--chart-1))',           // primary
  labourCost: 'hsl(var(--chart-3))',        // warning
  foodCost: 'hsl(var(--chart-2))',          // success
  orders: 'hsl(var(--chart-5))',            // purple
  labourCostPercent: 'hsl(var(--chart-3))',
  foodCostPercent: 'hsl(var(--chart-2))',
};

const LABELS: Record<string, string> = {
  revenue: 'Revenue',
  labourCost: 'Labour Cost',
  foodCost: 'Food Cost',
  orders: 'Orders',
  labourCostPercent: 'Labour %',
  foodCostPercent: 'Food %',
};

export function KPIChart({
  data,
  type,
  dataKeys,
  title,
  height = 300,
  yAxisFormatter,
}: KPIChartProps) {
  // Format data for display
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: formatDate(item.date, 'chart'),
  }));

  // Custom tooltip with theme-aware styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
          <p className="mb-1 text-xs font-medium text-popover-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-xs"
              style={{ color: entry.color }}
            >
              {LABELS[entry.dataKey] || entry.dataKey}:{' '}
              <span className="font-semibold">
                {typeof entry.value === 'number'
                  ? entry.dataKey.includes('Percent')
                    ? `${entry.value.toFixed(1)}%`
                    : entry.dataKey === 'orders'
                    ? entry.value.toLocaleString()
                    : `$${entry.value.toLocaleString()}`
                  : entry.value}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const commonProps = {
    data: formattedData,
    margin: { top: 10, right: 10, left: 0, bottom: 0 },
  };

  // Theme-aware axis styling
  const axisStyle = {
    tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
    axisLine: { stroke: 'hsl(var(--border))' },
    tickLine: { stroke: 'hsl(var(--border))' },
  };

  const gridStroke = 'hsl(var(--border))';

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.5} />
            <XAxis
              dataKey="displayDate"
              {...axisStyle}
            />
            <YAxis
              {...axisStyle}
              tickFormatter={yAxisFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => (
                <span className="text-muted-foreground">{LABELS[value] || value}</span>
              )}
            />
            {dataKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[key] || 'hsl(var(--chart-1))'}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.5} />
            <XAxis
              dataKey="displayDate"
              {...axisStyle}
            />
            <YAxis
              {...axisStyle}
              tickFormatter={yAxisFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => (
                <span className="text-muted-foreground">{LABELS[value] || value}</span>
              )}
            />
            {dataKeys.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[key] || 'hsl(var(--chart-1))'}
                fill={COLORS[key] || 'hsl(var(--chart-1))'}
                fillOpacity={0.15}
              />
            ))}
          </AreaChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={0.5} />
            <XAxis
              dataKey="displayDate"
              {...axisStyle}
            />
            <YAxis
              {...axisStyle}
              tickFormatter={yAxisFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => (
                <span className="text-muted-foreground">{LABELS[value] || value}</span>
              )}
            />
            {dataKeys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[key] || 'hsl(var(--chart-1))'}
                strokeWidth={2}
                dot={{ fill: COLORS[key] || 'hsl(var(--chart-1))', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={title ? 'pt-0' : 'pt-4'}>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
