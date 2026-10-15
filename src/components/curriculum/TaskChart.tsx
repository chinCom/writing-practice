'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '@mui/material/styles';

type TaskChartData = {
  title: string;
  kind: 'line' | 'bar';
  unit: string;
  years: number[];
  series: { label: string; data: number[] }[];
};

// Task IDs keep visuals available for already-seeded curricula without a database migration.
const charts: Record<string, TaskChartData> = {
  'ielts-task1-dynamic-charts-1-task': {
    title: 'Household internet access in Country X',
    kind: 'line',
    unit: '%',
    years: [2010, 2015, 2020],
    series: [
      { label: 'Fiber Broadband', data: [12, 38, 74] },
      { label: 'Mobile 4G/5G Data', data: [20, 55, 88] },
      { label: 'Fixed Dial-Up/ADSL', data: [65, 40, 9] },
    ],
  },
  'ielts-task1-dynamic-charts-2-task': {
    title: 'Annual book sales in the UK',
    kind: 'bar',
    unit: 'm',
    years: [2014, 2019, 2024],
    series: [
      { label: 'Hardcover Print', data: [80, 78, 82] },
      { label: 'E-books', data: [65, 50, 38] },
      { label: 'Audiobooks', data: [12, 35, 74] },
    ],
  },
  'ielts-task1-dynamic-charts-3-task': {
    title: 'Retail sales channels in Country Y',
    kind: 'line',
    unit: '%',
    years: [2005, 2015, 2025],
    series: [
      { label: 'Large Supermarkets', data: [58, 54, 49] },
      { label: 'Independent Local Shops', data: [36, 24, 13] },
      { label: 'Online E-Commerce', data: [6, 22, 38] },
    ],
  },
};

export default function TaskChart({ taskId }: { taskId: string }) {
  const theme = useTheme();
  const colors = [theme.palette.primary.main, theme.palette.warning.main, theme.palette.error.main];
  const chart = charts[taskId];
  if (!chart) return null;
  const Chart = chart.kind === 'line' ? LineChart : BarChart;
  return (
    <Box
      component="figure"
      aria-label={chart.title}
      dir="ltr"
      sx={{ margin: 0, marginBlock: 2, minInlineSize: 0 }}
    >
      <Typography component="figcaption" variant="subtitle1">
        {chart.title}
      </Typography>
      <Typography variant="caption">
        {chart.unit === '%' ? 'Percentage (%)' : 'Millions of copies'}
      </Typography>
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
      <Table
        size="small"
        aria-label={`${chart.title}: chart data`}
        sx={{
          '& th, & td': { paddingInline: 0.5, fontSize: '0.75rem', overflowWrap: 'anywhere' },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell>Series</TableCell>
            {chart.years.map((year) => (
              <TableCell key={year} align="right">
                {year}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {chart.series.map((series, index) => (
            <TableRow key={series.label}>
              <TableCell component="th" scope="row">
                <Box component="span" aria-hidden="true" sx={{ color: colors[index] }}>
                  ━{' '}
                </Box>
                {series.label}
              </TableCell>
              {series.data.map((value, index) => (
                <TableCell key={chart.years[index]} align="right">
                  {value}
                  {chart.unit}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
