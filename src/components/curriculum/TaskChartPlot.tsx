'use client';

import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import type { TaskChartData } from './TaskChart';

export default function TaskChartPlot({
  chart,
  colors,
}: {
  chart: TaskChartData;
  colors: string[];
}) {
  const Chart = chart.kind === 'line' ? LineChart : BarChart;
  return (
    <Chart
      height={260}
      skipAnimation
      hideLegend
      xAxis={[
        {
          data: chart.years,
          scaleType: 'band',
          height: 32,
          valueFormatter: (year: number) => String(year),
        },
      ]}
      yAxis={[{ min: 0, max: chart.unit === '%' ? 100 : undefined, width: 38 }]}
      series={chart.series.map((series, index) => ({
        ...series,
        color: colors[index],
        curve: 'linear' as const,
        valueFormatter: (value: number | null) => (value === null ? '' : `${value}${chart.unit}`),
      }))}
      grid={{ horizontal: true }}
      margin={{ left: 0, right: 8, top: 12, bottom: 28 }}
    />
  );
}
