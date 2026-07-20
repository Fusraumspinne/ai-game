"use client";

import { useMemo } from "react";
import { DAYS_PER_MONTH, DAYS_PER_YEAR, GAME_START_YEAR } from "@/app/game/data";
import {
  formatCompactMoney,
  getMonthlyFinancialProjection,
  getNetWorth,
  getPortfolioValue,
} from "@/app/game/engine";
import type { GameState, HistoryPoint } from "@/app/game/types";
import { MetricCard, Panel, PanelHeader, SectionTitle, StatusBadge } from "./game-ui";
import { Icon } from "./icons";
import { GroupedBarChart, TrendChart } from "./trend-chart";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function monthLabel(day: number) {
  const monthIndex = Math.max(0, Math.ceil(day / DAYS_PER_MONTH) - 1);
  const year = GAME_START_YEAR + Math.floor(monthIndex / 12);
  return `${String((monthIndex % 12) + 1).padStart(2, "0")}/${year}`;
}

function margin(profit: number, revenue: number) {
  return revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)} %` : "–";
}

export function AccountingSection({ state }: { state: GameState }) {
  const currentProfit = state.monthlyRevenue - state.monthlyExpenses;
  const monthly = useMemo<HistoryPoint[]>(
    () => {
      const current: HistoryPoint = {
        day: state.day,
        revenue: state.monthlyRevenue,
        productRevenue: state.monthlyProductRevenue,
        contractRevenue: state.monthlyContractRevenue,
        expenses: state.monthlyExpenses,
        profit: currentProfit,
        valuation: state.valuation,
        cash: state.cash,
        debt: state.debt,
        marketShare: state.marketShare,
        employees: Object.values(state.employees).reduce((sum, amount) => sum + amount, 0),
        brand: state.brand,
      };
      return state.day % DAYS_PER_MONTH === 0 && state.history.length
        ? state.history
        : [...state.history, current];
    },
    [state, currentProfit],
  );
  const yearly = useMemo(() => {
    const grouped = new Map<number, HistoryPoint>();
    for (const item of monthly) {
      const year = GAME_START_YEAR + Math.floor(Math.max(0, item.day - 1) / DAYS_PER_YEAR);
      const previous = grouped.get(year);
      grouped.set(year, {
        day: item.day,
        revenue: (previous?.revenue ?? 0) + item.revenue,
        productRevenue: (previous?.productRevenue ?? 0) + (item.productRevenue ?? item.revenue),
        contractRevenue: (previous?.contractRevenue ?? 0) + (item.contractRevenue ?? 0),
        expenses: (previous?.expenses ?? 0) + item.expenses,
        profit: (previous?.profit ?? 0) + item.profit,
        valuation: item.valuation,
        cash: item.cash,
        debt: item.debt,
        marketShare: item.marketShare,
        employees: item.employees,
        brand: item.brand,
      });
    }
    return [...grouped.entries()].map(([year, point]) => ({ year, ...point }));
  }, [monthly]);
  const chart = monthly.slice(-12);
  const developmentChart = monthly;
  const projection = getMonthlyFinancialProjection(state);
  const projectedMonthlyProfit = projection.profit;

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Finanzbuchhaltung"
        title="Buchhaltung & Controlling"
        description="Monats- und Jahresabschlüsse, Kostenstruktur und Unternehmensentwicklung an einem Ort."
        action={<StatusBadge tone={currentProfit >= 0 ? "success" : "danger"} dot>{currentProfit >= 0 ? "Positives Ergebnis" : "Verlustperiode"}</StatusBadge>}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Umsatz laufender Monat" value={formatCompactMoney(state.monthlyRevenue)} detail={`${formatCompactMoney(state.monthlyProductRevenue)} Produkte · ${formatCompactMoney(state.monthlyContractRevenue)} Aufträge`} icon={<Icon name="coins" size={17} />} tone="cyan" />
        <MetricCard label="Aufwand laufender Monat" value={formatCompactMoney(state.monthlyExpenses)} detail="Betrieb, Personal und Zinsen" icon={<Icon name="finance" size={17} />} />
        <MetricCard label="Betriebsergebnis" value={formatCompactMoney(currentProfit)} detail={`${margin(currentProfit, state.monthlyRevenue)} Marge`} icon={<Icon name={currentProfit >= 0 ? "trendUp" : "trendDown"} size={17} />} tone={currentProfit >= 0 ? "green" : "amber"} />
        <MetricCard label="Nettovermögen" value={formatCompactMoney(getNetWorth(state))} detail={`davon ${formatCompactMoney(getPortfolioValue(state))} Wertpapiere`} icon={<Icon name="building" size={17} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Monatsentwicklung" description="Umsatz und Aufwand der letzten zwölf Monate inklusive laufender Periode." />
          <div className="mt-5">
            <GroupedBarChart
              ariaLabel="Vergleich von Umsatz und Aufwand der letzten zwölf Monate"
              labels={chart.map((item) => monthLabel(item.day))}
              series={[
                { label: "Gesamtumsatz", color: "#2563eb", values: chart.map((item) => item.revenue), formatValue: formatCompactMoney },
                { label: "Aufwand", color: "#94a3b8", values: chart.map((item) => item.expenses), formatValue: formatCompactMoney },
              ]}
            />
          </div>
        </Panel>

        <Panel padding="none" className="overflow-hidden">
          <div className="p-4 sm:p-5">
            <PanelHeader
              title="Monatliche Abrechnung"
              description="Hochrechnung aus dem aktuellen Tagesgeschäft und den derzeitigen Verträgen."
              action={
                <StatusBadge tone={projectedMonthlyProfit >= 0 ? "success" : "danger"}>
                  {projectedMonthlyProfit >= 0 ? "Gewinn" : "Verlust"}
                </StatusBadge>
              }
            />
          </div>
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full min-w-[34rem] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold tracking-wide uppercase">Position</th>
                  <th className="px-4 py-3 text-right font-semibold tracking-wide uppercase">Einnahmen</th>
                  <th className="px-4 py-3 text-right font-semibold tracking-wide uppercase">Ausgaben</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { label: "Produktverkäufe", income: projection.productRevenue, expense: 0 },
                  { label: "Firmenkundenaufträge", income: projection.contractRevenue, expense: 0 },
                  { label: "Umsatz übernommener Unternehmen", income: projection.subsidiaryRevenue, expense: 0 },
                  { label: "Dividenden aus Beteiligungen", income: projection.portfolioIncome, expense: 0 },
                  { label: "Produktion & Material", income: 0, expense: projection.productionExpenses },
                  { label: "Garantie & Retouren", income: 0, expense: projection.warrantyExpenses },
                  { label: "Personal", income: 0, expense: projection.payrollExpenses },
                  { label: "Marketing & Kampagnen", income: 0, expense: projection.marketingExpenses },
                  { label: "Fabrikwartung", income: 0, expense: projection.maintenanceExpenses },
                  {
                    label: "Kreditrate",
                    income: 0,
                    expense: projection.creditPayment,
                  },
                  { label: "Vertragsstrafen", income: 0, expense: projection.contractPenalties },
                  { label: "Kosten übernommener Unternehmen", income: 0, expense: projection.subsidiaryExpenses },
                ].map((entry) => (
                  <tr key={entry.label} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 text-slate-700">{entry.label}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-700 tabular-nums">
                      {entry.income > 0 ? money.format(entry.income) : "–"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-rose-700 tabular-nums">
                      {entry.expense > 0 ? money.format(entry.expense) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-900">Summe Zahlungsströme</th>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">{money.format(projection.totalIncome)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-rose-700 tabular-nums">{money.format(projection.totalOutflow)}</td>
                </tr>
                <tr className={projectedMonthlyProfit >= 0 ? "bg-emerald-50" : "bg-rose-50"}>
                  <th className="px-4 py-3 font-semibold text-slate-950">Voraussichtlicher Monatsgewinn</th>
                  <td colSpan={2} className={`px-4 py-3 text-right font-mono text-base font-bold tabular-nums ${projectedMonthlyProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {money.format(projectedMonthlyProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Unternehmenswert & Liquidität"
            description="Gesamte Entwicklung seit der Gründung; ältere Zeiträume sind kompakt nach Geschäftsjahren zusammengefasst."
          />
          <div className="mt-5">
            <TrendChart
              ariaLabel="Verlauf von Unternehmenswert und Liquidität"
              labels={developmentChart.map((item) => monthLabel(item.day))}
              series={[
                { label: "Unternehmenswert", color: "#2563eb", values: developmentChart.map((item) => item.valuation), formatValue: formatCompactMoney },
                { label: "Liquidität", color: "#64748b", values: developmentChart.map((item) => item.cash), formatValue: formatCompactMoney },
              ]}
            />
          </div>
        </Panel>
        <Panel>
          <PanelHeader
            title="Markt & Organisation"
            description="Marktanteil, Markenstärke und Teamgröße seit der Gründung."
          />
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <TrendChart
              ariaLabel="Verlauf des Marktanteils"
              labels={developmentChart.map((item) => monthLabel(item.day))}
              includeZero
              series={[
                { label: "Marktanteil", color: "#059669", values: developmentChart.map((item) => item.marketShare), formatValue: (value) => `${value.toFixed(2)} %` },
              ]}
            />
            <TrendChart
              ariaLabel="Verlauf der Markenstärke"
              labels={developmentChart.map((item) => monthLabel(item.day))}
              includeZero
              series={[
                { label: "Marke", color: "#d97706", values: developmentChart.map((item) => item.brand), formatValue: (value) => value.toFixed(0) },
              ]}
            />
            <TrendChart
              ariaLabel="Entwicklung der Mitarbeiterzahl"
              labels={developmentChart.map((item) => monthLabel(item.day))}
              includeZero
              series={[
                { label: "Mitarbeitende", color: "#7c3aed", values: developmentChart.map((item) => item.employees), formatValue: (value) => Math.round(value).toLocaleString("de-DE") },
              ]}
            />
          </div>
        </Panel>
      </div>

      <Panel padding="none" className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <PanelHeader title="Jahresabschlüsse" description="Ein kompakter Eintrag pro Geschäftsjahr statt einer langen Monatsliste." />
        </div>
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>{["Jahr", "Gesamtumsatz", "Aufwand", "Ergebnis", "Marge", "Liquidität", "Schulden", "Unternehmenswert", "Marktanteil", "Mitarbeitende"].map((label) => <th key={label} className="px-4 py-3 font-semibold uppercase tracking-wide">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200">
              {yearly.slice().reverse().map((item, index) => (
                <tr key={`${item.day}-${index}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{item.year}</td>
                  {[item.revenue, item.expenses, item.profit].map((value, valueIndex) => <td key={valueIndex} className={`px-4 py-3 font-mono tabular-nums ${valueIndex === 2 ? (value >= 0 ? "text-emerald-700" : "text-rose-700") : "text-slate-700"}`}>{money.format(value)}</td>)}
                  <td className="px-4 py-3 font-mono text-slate-700">{margin(item.profit, item.revenue)}</td><td className="px-4 py-3 font-mono text-slate-700">{money.format(item.cash)}</td><td className="px-4 py-3 font-mono text-slate-700">{money.format(item.debt)}</td><td className="px-4 py-3 font-mono text-slate-700">{money.format(item.valuation)}</td><td className="px-4 py-3 font-mono text-slate-700">{item.marketShare.toFixed(2)} %</td><td className="px-4 py-3 font-mono text-slate-700">{Math.round(item.employees).toLocaleString("de-DE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

    </div>
  );
}
