"use client";

import { useMemo } from "react";
import { DAYS_PER_MONTH, DAYS_PER_YEAR, GAME_START_YEAR } from "@/app/game/data";
import {
  formatCompactMoney,
  getAnnualInterestRate,
  getDailyMarketingCost,
  getDailyPayroll,
  getNetWorth,
  getPortfolioValue,
  getProductEconomics,
} from "@/app/game/engine";
import type { GameState, HistoryPoint } from "@/app/game/types";
import { MetricCard, Panel, PanelHeader, SectionTitle, StatusBadge } from "./game-ui";
import { Icon } from "./icons";
import { TrendChart } from "./trend-chart";

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
  const chartMax = Math.max(1, ...chart.flatMap((item) => [item.revenue, item.expenses]));
  const inventoryValue = state.products.reduce((sum, product) => {
    const economics = getProductEconomics(state, product);
    return sum + product.inventory * (economics?.unitCost ?? 0);
  }, 0);
  const payrollMonth = getDailyPayroll(state) * DAYS_PER_MONTH;
  const marketingMonth = getDailyMarketingCost(state) * DAYS_PER_MONTH;
  const interestMonth = (state.debt * getAnnualInterestRate(state)) / 12;

  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Finanzbuchhaltung"
        title="Buchhaltung & Controlling"
        description="Monats- und Jahresabschlüsse, Kostenstruktur und Deckungsbeiträge deiner Produkte an einem Ort."
        action={<StatusBadge tone={currentProfit >= 0 ? "success" : "danger"} dot>{currentProfit >= 0 ? "Positives Ergebnis" : "Verlustperiode"}</StatusBadge>}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="Umsatz laufender Monat" value={formatCompactMoney(state.monthlyRevenue)} detail="Noch nicht abgeschlossen" icon={<Icon name="coins" size={17} />} tone="cyan" />
        <MetricCard label="Aufwand laufender Monat" value={formatCompactMoney(state.monthlyExpenses)} detail="Betrieb, Personal und Zinsen" icon={<Icon name="finance" size={17} />} />
        <MetricCard label="Betriebsergebnis" value={formatCompactMoney(currentProfit)} detail={`${margin(currentProfit, state.monthlyRevenue)} Marge`} icon={<Icon name={currentProfit >= 0 ? "trendUp" : "trendDown"} size={17} />} tone={currentProfit >= 0 ? "green" : "amber"} />
        <MetricCard label="Nettovermögen" value={formatCompactMoney(getNetWorth(state))} detail={`davon ${formatCompactMoney(getPortfolioValue(state))} Wertpapiere`} icon={<Icon name="building" size={17} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel>
          <PanelHeader title="Monatsentwicklung" description="Umsatz und Aufwand der letzten zwölf Monate inklusive laufender Periode." />
          <div className="mt-6 flex h-52 items-end gap-2 border-b border-slate-200 pb-1">
            {chart.map((item, index) => (
              <div key={`${item.day}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${monthLabel(item.day)}: ${money.format(item.revenue)} Umsatz`}>
                <div className="flex h-40 w-full items-end justify-center gap-0.5">
                  <span className="w-2/5 rounded-t bg-blue-500" style={{ height: `${Math.max(2, (item.revenue / chartMax) * 100)}%` }} />
                  <span className="w-2/5 rounded-t bg-slate-400" style={{ height: `${Math.max(2, (item.expenses / chartMax) * 100)}%` }} />
                </div>
                <span className="truncate text-[0.58rem] text-slate-500">{monthLabel(item.day)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-5 text-xs text-slate-600"><span><i className="mr-2 inline-block size-2 rounded-sm bg-blue-500" />Umsatz</span><span><i className="mr-2 inline-block size-2 rounded-sm bg-slate-400" />Aufwand</span></div>
        </Panel>

        <Panel>
          <PanelHeader title="Monatliche Fixkosten" description="Hochrechnung bei aktueller Aufstellung." />
          <dl className="mt-5 divide-y divide-slate-200 text-sm">
            {[
              ["Personal", payrollMonth],
              ["Marketing", marketingMonth],
              ["Kreditzinsen", interestMonth],
              ["Lagerbestand", inventoryValue],
              ["Verbindlichkeiten", state.debt],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-4 py-3"><dt className="text-slate-600">{label}</dt><dd className="font-mono font-medium text-slate-900 tabular-nums">{money.format(Number(value))}</dd></div>
            ))}
          </dl>
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
            <thead className="bg-slate-50 text-slate-500"><tr>{["Jahr", "Umsatz", "Aufwand", "Ergebnis", "Marge", "Liquidität", "Schulden", "Unternehmenswert", "Marktanteil", "Mitarbeitende"].map((label) => <th key={label} className="px-4 py-3 font-semibold uppercase tracking-wide">{label}</th>)}</tr></thead>
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

      <Panel padding="none" className="overflow-hidden">
        <div className="p-4 sm:p-5"><PanelHeader title="Produktrechnung" description="Verkauf, Bestand und geschätzter Deckungsbeitrag je Produkt." /></div>
        <div className="overflow-x-auto border-t border-slate-200">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>{["Produkt", "Status", "Preis", "Stückkosten", "Stückmarge", "Absatz/Tag", "Produktion/Tag", "Bestand"].map((label) => <th key={label} className="px-4 py-3 font-semibold uppercase tracking-wide">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-200">{state.products.map((product) => { const economics = getProductEconomics(state, product); return <tr key={product.id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-semibold text-slate-900">{product.name}</p><p className="mt-0.5 text-slate-500">Technikfit {Math.round((economics?.modernity ?? 0) * 100)} %</p></td><td className="px-4 py-3"><StatusBadge tone={product.active ? "success" : "neutral"}>{product.active ? "Aktiv" : "Eingestellt"}</StatusBadge></td><td className="px-4 py-3 font-mono text-slate-700">{money.format(product.price)}</td><td className="px-4 py-3 font-mono text-slate-700">{money.format(economics?.unitCost ?? 0)}</td><td className="px-4 py-3 font-mono text-emerald-700">{money.format(economics?.unitMargin ?? 0)}</td><td className="px-4 py-3 font-mono text-slate-700">{product.lastSales.toFixed(1)}</td><td className="px-4 py-3 font-mono text-slate-700">{product.lastProduction.toFixed(1)}</td><td className="px-4 py-3 font-mono text-slate-700">{product.inventory.toFixed(1)}</td></tr>; })}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
