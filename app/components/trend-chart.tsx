"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import type { ReactNode } from "react";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
);

const gridColor = "rgba(148, 163, 184, 0.22)";
const tickColor = "#64748b";
const chartFont = { family: "ui-monospace, SFMono-Regular, Menlo, monospace", size: 10 };

function compactNumber(value: number) {
  return new Intl.NumberFormat("de-DE", {
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function tooltipText(value: ReactNode, fallback: number) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : compactNumber(fallback);
}

export interface TrendSeries {
  label: string;
  color: string;
  values: readonly number[];
  formatValue?: (value: number) => ReactNode;
}

export function TrendChart({
  series,
  labels,
  ariaLabel,
  includeZero = false,
}: {
  series: readonly TrendSeries[];
  labels?: readonly string[];
  ariaLabel: string;
  includeZero?: boolean;
}) {
  const count = Math.max(0, ...series.map((item) => item.values.length));
  const resolvedLabels = Array.from(
    { length: count },
    (_, index) => labels?.[index] ?? String(index + 1),
  );
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 180 },
    normalized: true,
    interaction: { mode: "index", intersect: false },
    layout: { padding: { top: 4, right: 5 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        padding: 10,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          label: (context: TooltipItem<"line">) => {
            const item = series[context.datasetIndex];
            const value = context.parsed.y ?? 0;
            const formatted = item?.formatValue?.(value);
            return `${item?.label ?? "Wert"}: ${tooltipText(formatted, value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 6,
          maxRotation: 0,
          color: tickColor,
          font: chartFont,
        },
      },
      y: {
        beginAtZero: includeZero,
        border: { display: false },
        grid: { color: gridColor, drawTicks: false },
        ticks: {
          color: tickColor,
          font: chartFont,
          maxTicksLimit: 5,
          padding: 7,
          callback: (value) => compactNumber(Number(value)),
        },
      },
    },
  };

  return (
    <div>
      <div className="h-44 w-full">
        <Line
          role="img"
          aria-label={ariaLabel}
          data={{
            labels: resolvedLabels,
            datasets: series.map((item, index) => ({
              label: item.label,
              data: [...item.values],
              borderColor: item.color,
              backgroundColor: `${item.color}16`,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBorderWidth: 2,
              pointHoverBackgroundColor: "#ffffff",
              pointHoverBorderColor: item.color,
              fill: index === 0 && series.length === 1 ? "origin" : false,
              tension: 0,
            })),
          }}
          options={options}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        {series.map((item) => {
          const current = item.values.at(-1) ?? 0;
          return (
            <span key={item.label} className="inline-flex items-center gap-2">
              <i className="inline-block size-2 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
              <strong className="font-mono font-medium text-slate-900 tabular-nums">
                {item.formatValue ? item.formatValue(current) : compactNumber(current)}
              </strong>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function GroupedBarChart({
  labels,
  series,
  ariaLabel,
}: {
  labels: readonly string[];
  series: readonly TrendSeries[];
  ariaLabel: string;
}) {
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 180 },
    normalized: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        align: "start",
        labels: {
          boxWidth: 9,
          boxHeight: 9,
          color: "#475569",
          padding: 18,
          font: { family: "Arial, Helvetica, sans-serif", size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (context: TooltipItem<"bar">) => {
            const item = series[context.datasetIndex];
            const value = context.parsed.y ?? 0;
            return `${item?.label ?? "Wert"}: ${tooltipText(item?.formatValue?.(value), value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: tickColor, font: chartFont, maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: gridColor, drawTicks: false },
        ticks: {
          color: tickColor,
          font: chartFont,
          padding: 7,
          maxTicksLimit: 5,
          callback: (value) => compactNumber(Number(value)),
        },
      },
    },
  };

  return (
    <div className="h-56 w-full">
      <Bar
        role="img"
        aria-label={ariaLabel}
        data={{
          labels: [...labels],
          datasets: series.map((item) => ({
            label: item.label,
            data: [...item.values],
            backgroundColor: item.color,
            borderRadius: 3,
            borderSkipped: false,
            maxBarThickness: 28,
          })),
        }}
        options={options}
      />
    </div>
  );
}

export function StockPriceChart({
  labels,
  values,
  fairValue,
  color,
  ariaLabel,
}: {
  labels: readonly string[];
  values: readonly number[];
  fairValue: number;
  color: string;
  ariaLabel: string;
}) {
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 160 },
    normalized: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 9,
        cornerRadius: 6,
        callbacks: {
          label: (context: TooltipItem<"line">) =>
            `${context.dataset.label}: ${(context.parsed.y ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: tickColor, font: chartFont, autoSkip: true, maxTicksLimit: 3, maxRotation: 0 },
      },
      y: {
        border: { display: false },
        grid: { color: gridColor, drawTicks: false },
        ticks: {
          color: tickColor,
          font: chartFont,
          padding: 6,
          maxTicksLimit: 4,
          callback: (value) => Number(value).toLocaleString("de-DE", { maximumFractionDigits: 2 }),
        },
      },
    },
  };

  return (
    <div className="h-36 w-full rounded-md border border-slate-200 bg-white p-2">
      <Line
        role="img"
        aria-label={ariaLabel}
        data={{
          labels: [...labels],
          datasets: [
            {
              label: "Kurs",
              data: [...values],
              borderColor: color,
              backgroundColor: `${color}14`,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBorderWidth: 2,
              pointHoverBackgroundColor: "#ffffff",
              pointHoverBorderColor: color,
              fill: true,
              tension: 0,
            },
            {
              label: "Fairer Wert",
              data: values.map(() => fairValue),
              borderColor: "#2563eb",
              borderWidth: 1,
              borderDash: [5, 4],
              pointRadius: 0,
              fill: false,
              tension: 0,
            },
          ],
        }}
        options={options}
      />
    </div>
  );
}
