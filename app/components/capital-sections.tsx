"use client";

import { useState } from "react";
import type { Dispatch } from "react";
import type { CompetitorState, GameAction, GameState } from "@/app/game/types";
import {
  ActionButton,
  DeltaBadge,
  MetricCard,
  Panel,
  PanelHeader,
  ProgressBar,
  SectionTitle,
  Sparkline,
  StatusBadge,
} from "./game-ui";
import { AreaChart, DonutGauge, StatRow } from "./game-widgets";
import { Icon } from "./icons";

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function compactMoney(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1_000_000_000) return `${sign}${(absolute / 1_000_000_000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Mrd. €`;
  if (absolute >= 1_000_000) return `${sign}${(absolute / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Mio. €`;
  if (absolute >= 1_000) return `${sign}${(absolute / 1_000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Tsd. €`;
  return money.format(value);
}

function payroll(state: GameState) {
  const rates = { production: 112, research: 184, marketing: 148, sales: 139, finance: 196 };
  return (Object.keys(rates) as Array<keyof typeof rates>).reduce((sum, key) => sum + state.employees[key] * rates[key], 0);
}

function portfolioValue(state: GameState) {
  return state.competitors.reduce((sum, company) => sum + company.ownedShares * company.price, 0);
}

function creditLimit(state: GameState) {
  const revenueBase = Math.max(state.lastMonthRevenue, state.monthlyRevenue) * 6;
  const financeBonus = 1 + Math.max(0, state.departmentLevels.finance - 1) * 0.06;
  return Math.max(0, (state.valuation * 0.28 + revenueBase) * financeBonus - state.debt);
}

function pctChange(history: number[]) {
  if (history.length < 2) return 0;
  const first = history[0] || 1;
  return ((history.at(-1)! - first) / first) * 100;
}

function controlInfo(ownership: number) {
  if (ownership >= 75) return { label: "Volle Kontrolle", tone: "success" as const, detail: "Strategische Entscheidungen liegen bei dir." };
  if (ownership >= 50) return { label: "Operative Mehrheit", tone: "success" as const, detail: "Du behältst eine sichere Stimmenmehrheit." };
  if (ownership >= 33.4) return { label: "Sperrminorität", tone: "warning" as const, detail: "Große Beschlüsse kannst du blockieren, aber nicht alleine steuern." };
  if (ownership >= 25) return { label: "Board-abhängig", tone: "warning" as const, detail: "Investoren können deine Strategie blockieren." };
  return { label: "Kontrollverlust droht", tone: "danger" as const, detail: "Ein feindlicher Bieter könnte dich als CEO ablösen." };
}

export function FinanceSection({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const ownership = (state.founderShares / state.totalShares) * 100;
  const publicShares = state.totalShares - state.founderShares;
  const control = controlInfo(ownership);
  const monthRevenue = state.lastMonthRevenue || state.monthlyRevenue;
  const monthExpenses = state.lastMonthExpenses || state.monthlyExpenses;
  const profit = monthRevenue - monthExpenses;
  const payrollMonthly = payroll(state) * 30;
  const interestMonthly = state.debt * 0.072 / 12;
  const availableCredit = creditLimit(state);
  const cashSeries = state.history.map((point) => point.cash);
  const history = cashSeries.length > 1 ? cashSeries : [state.cash * 0.85, state.cash * 0.94, state.cash];
  const issuePercent = 0.05;
  const issueShares = state.totalShares * issuePercent;
  const issueProceeds = issueShares * state.sharePrice * 0.94;
  const dilutedOwnership = (state.founderShares / (state.totalShares + issueShares)) * 100;
  const buybackPercent = 0.02;
  const buybackShares = Math.min(publicShares, state.totalShares * buybackPercent);
  const buybackCost = buybackShares * state.sharePrice * 1.06;
  const postBuybackOwnership = (state.founderShares / (state.totalShares - buybackShares)) * 100;

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Finanzen & Eigentum" title="Kapitalallokation" description="Wachstum braucht Kapital. Schulden kosten Zins, neue Aktien verwässern Kontrolle – Gewinne erhalten beides." action={<StatusBadge tone={control.tone} dot>{control.label}</StatusBadge>} />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <MetricCard label="Liquidität" value={compactMoney(state.cash)} detail="Sofort verfügbar" tone="cyan" icon={<Icon name="wallet" size={17} />} />
        <MetricCard label="Monatsergebnis" value={compactMoney(profit)} detail={`${monthRevenue > 0 ? ((profit / monthRevenue) * 100).toFixed(1) : "0"} % operative Marge`} tone={profit >= 0 ? "green" : "amber"} icon={<Icon name={profit >= 0 ? "trendUp" : "trendDown"} size={17} />} />
        <MetricCard label="Fremdkapital" value={compactMoney(state.debt)} detail={`${money.format(interestMonthly)} Zins / Monat`} tone="amber" icon={<Icon name="finance" size={17} />} />
        <MetricCard label="Depotwert" value={compactMoney(portfolioValue(state))} detail="Beteiligungen an Tech-Firmen" tone="violet" icon={<Icon name="stocks" size={17} />} />
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.45fr_1fr]">
        <Panel>
          <PanelHeader eyebrow="Gewinn & Verlust" title="Monatsabschluss" description="Operativer Blick auf Umsatz, laufende Kosten und Finanzierung." action={<StatusBadge tone={profit >= 0 ? "success" : "danger"}>{profit >= 0 ? "PROFITABEL" : "VERLUST"}</StatusBadge>} />
          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_1.2fr]">
            <div>
              <StatRow label="Umsatzerlöse" value={compactMoney(monthRevenue)} icon="trendUp" tone="positive" />
              <StatRow label="Personalaufwand" value={`−${compactMoney(payrollMonthly)}`} icon="people" tone="negative" />
              <StatRow label="Marketing & Kampagnen" value={`−${compactMoney(Math.min(monthExpenses, state.marketingBudget * 30 + (state.campaign?.dailyCost ?? 0) * 30) )}`} icon="marketing" tone="negative" />
              <StatRow label="Zinsaufwand" value={`−${compactMoney(interestMonthly)}`} icon="finance" tone={interestMonthly > 0 ? "negative" : "neutral"} />
              <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-3"><span className="text-xs font-semibold text-slate-200">Operatives Ergebnis</span><span className={`font-mono text-sm font-semibold ${profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{compactMoney(profit)}</span></div>
            </div>
            <div className="min-w-0 rounded-xl border border-white/[0.055] bg-black/10 p-3"><p className="mb-2 text-[0.62rem] font-semibold tracking-wide text-slate-600 uppercase">Cash-Entwicklung</p><div className="h-36"><AreaChart values={history} height={144} positive={history.at(-1)! >= history[0]} label="Entwicklung der Liquidität" /></div></div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Bilanz" title="Vermögen & Finanzierung" description="Nettovermögen und Tragfähigkeit deiner Schulden." />
          <div className="mt-4"><StatRow label="Kasse" value={compactMoney(state.cash)} icon="wallet" /><StatRow label="Wertpapierdepot" value={compactMoney(portfolioValue(state))} icon="stocks" /><StatRow label="Unternehmenswert" value={compactMoney(state.valuation)} icon="building" /><StatRow label="Schulden" value={`−${compactMoney(state.debt)}`} icon="finance" tone={state.debt > 0 ? "negative" : "neutral"} /></div>
          <div className="mt-4 rounded-xl bg-white/[0.03] p-3"><ProgressBar value={Math.min(100, (state.debt / Math.max(1, state.valuation)) * 100)} label="Verschuldungsgrad" valueLabel={`${((state.debt / Math.max(1, state.valuation)) * 100).toFixed(1)} %`} tone={state.debt / state.valuation < 0.25 ? "green" : state.debt / state.valuation < 0.5 ? "amber" : "red"} /></div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader eyebrow="Kreditmarkt" title="Wachstum mit Fremdkapital" description={`Verfügbare Kreditlinie: ${compactMoney(availableCredit)} · variabler Zins ca. 7,2 % p.a.`} />
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[50_000, 250_000, 1_000_000].map((amount) => <ActionButton key={amount} variant="secondary" disabled={amount > availableCredit} onClick={() => dispatch({ type: "BORROW", amount })}>{compactMoney(amount)}</ActionButton>)}
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5"><div><p className="text-xs font-medium text-slate-300">Offener Kredit</p><p className="mt-1 font-mono text-sm text-amber-200">{compactMoney(state.debt)}</p></div><div className="flex gap-2"><ActionButton size="sm" variant="secondary" disabled={state.debt <= 0 || state.cash < Math.min(50_000, state.debt)} onClick={() => dispatch({ type: "REPAY", amount: Math.min(50_000, state.debt) })}>50 Tsd. tilgen</ActionButton><ActionButton size="sm" disabled={state.debt <= 0 || state.cash < state.debt} onClick={() => dispatch({ type: "REPAY", amount: state.debt })}>Alles tilgen</ActionButton></div></div>
          <p className="mt-3 text-[0.66rem] leading-4 text-slate-600">Mehr Finanzerfahrung, Umsatz und Unternehmenswert erhöhen die Kreditlinie. Hohe Verschuldung senkt den Aktienwert und macht Übernahmen riskanter.</p>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Cap Table" title="Eigentum & Stimmrechte" description={control.detail} action={<DonutGauge size={76} value={ownership} label={`${ownership.toFixed(0)}%`} tone={ownership >= 50 ? "#6ee7b7" : "#fbbf24"} />} />
          <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.06]"><div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/[0.055] bg-white/[0.025] px-3 py-2 text-[0.6rem] text-slate-600 uppercase"><span>Eigentümer</span><span>Aktien</span><span>Anteil</span></div><div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-3 text-xs"><span className="flex items-center gap-2 text-slate-300"><span className="size-2 rounded-full bg-cyan-300" />Gründer</span><span className="font-mono text-slate-400">{Math.round(state.founderShares).toLocaleString("de-DE")}</span><span className="w-14 text-right font-mono text-cyan-300">{ownership.toFixed(1)} %</span></div><div className="grid grid-cols-[1fr_auto_auto] gap-3 border-t border-white/[0.05] px-3 py-3 text-xs"><span className="flex items-center gap-2 text-slate-300"><span className="size-2 rounded-full bg-slate-600" />Streubesitz</span><span className="font-mono text-slate-400">{Math.round(publicShares).toLocaleString("de-DE")}</span><span className="w-14 text-right font-mono text-slate-400">{(100 - ownership).toFixed(1)} %</span></div></div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader eyebrow="Eigenkapital" title="Kapital erhöhen oder Anteile zurückkaufen" description="Die Vorschau zeigt den Effekt auf Cash und Kontrolle, bevor du entscheidest." />
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.065] bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Icon name="plus" size={17} /></span><StatusBadge tone="info">WACHSTUM</StatusBadge></div><h3 className="mt-3 text-sm font-semibold text-slate-100">5 % neue Aktien ausgeben</h3><p className="mt-1 text-xs leading-5 text-slate-500">Kapital fließt in die Firma. Deine Aktienzahl bleibt gleich, dein prozentualer Anteil sinkt.</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg bg-white/[0.035] p-2.5"><p className="text-[0.6rem] text-slate-600 uppercase">Cashzufluss</p><p className="mt-1 font-mono text-sm text-emerald-300">+{compactMoney(issueProceeds)}</p></div><div className="rounded-lg bg-white/[0.035] p-2.5"><p className="text-[0.6rem] text-slate-600 uppercase">Dein Anteil</p><p className="mt-1 font-mono text-sm text-amber-300">{ownership.toFixed(1)} → {dilutedOwnership.toFixed(1)} %</p></div></div><ActionButton className="mt-4 w-full" onClick={() => dispatch({ type: "ISSUE_SHARES", percent: issuePercent })}>Kapitalerhöhung durchführen</ActionButton></div>
          <div className="rounded-2xl border border-white/[0.065] bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-300/10 text-violet-300"><Icon name="minus" size={17} /></span><StatusBadge tone="violet">KONTROLLE</StatusBadge></div><h3 className="mt-3 text-sm font-semibold text-slate-100">2 % Aktien zurückkaufen</h3><p className="mt-1 text-xs leading-5 text-slate-500">Die Firma kauft Aktien mit Aufschlag und zieht sie ein. Dein prozentualer Anteil steigt.</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg bg-white/[0.035] p-2.5"><p className="text-[0.6rem] text-slate-600 uppercase">Kosten</p><p className="mt-1 font-mono text-sm text-rose-300">−{compactMoney(buybackCost)}</p></div><div className="rounded-lg bg-white/[0.035] p-2.5"><p className="text-[0.6rem] text-slate-600 uppercase">Dein Anteil</p><p className="mt-1 font-mono text-sm text-emerald-300">{ownership.toFixed(1)} → {postBuybackOwnership.toFixed(1)} %</p></div></div><ActionButton className="mt-4 w-full" variant="secondary" disabled={publicShares <= 0 || state.cash < buybackCost} onClick={() => dispatch({ type: "BUYBACK_SHARES", percent: buybackPercent })}>Rückkauf durchführen</ActionButton></div>
        </div>
        <div className="mt-5 grid grid-cols-5 gap-1.5">{[[75,"Volle Kontrolle"],[50,"Mehrheit"],[33.4,"Sperrminorität"],[25,"Board-Risiko"],[10,"CEO-Risiko"]].map(([threshold,label]) => { const active = ownership >= Number(threshold); return <div key={label} className={`rounded-lg border px-2 py-2.5 text-center ${active ? "border-cyan-300/15 bg-cyan-300/[0.04]" : "border-white/[0.04] bg-black/10 opacity-45"}`}><p className={`font-mono text-xs ${active ? "text-cyan-300" : "text-slate-600"}`}>≥ {threshold} %</p><p className="mt-1 truncate text-[0.55rem] text-slate-600">{label}</p></div>; })}</div>
      </Panel>
    </div>
  );
}

function StockCard({ company, state, dispatch }: { company: CompetitorState; state: GameState; dispatch: Dispatch<GameAction> }) {
  const [shares, setShares] = useState(100);
  const change = pctChange(company.history);
  const dailyChange = company.history.length > 1 ? ((company.price - company.history[company.history.length - 2]) / company.history[company.history.length - 2]) * 100 : 0;
  const cost = shares * company.price;
  const holdingValue = company.ownedShares * company.price;
  const upside = ((company.fairValue - company.price) / company.price) * 100;
  const marketCap = company.price * company.sharesOutstanding;
  const ownedPercent = (company.ownedShares / company.sharesOutstanding) * 100;

  return (
    <Panel padding="none" className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-4 pb-3 sm:p-5 sm:pb-3">
        <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl text-[0.68rem] font-bold" style={{ color: company.color, backgroundColor: `${company.color}16` }}>{company.ticker}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-100">{company.name}</h3><p className="mt-0.5 text-[0.65rem] text-slate-600">{company.sector}</p></div></div>
        <div className="text-right"><p className="font-mono text-base font-semibold text-slate-100">{money.format(company.price)}</p><DeltaBadge className="mt-1" value={`${Math.abs(dailyChange).toFixed(2)} %`} direction={dailyChange >= 0 ? "up" : "down"} /></div>
      </div>
      <Sparkline data={company.history} tone={change >= 0 ? "green" : "red"} className="h-14 px-3" ariaLabel={`Kursverlauf ${company.name}`} />
      <div className="grid grid-cols-3 gap-px border-y border-white/[0.055] bg-white/[0.055]"><div className="bg-[#111820] p-2.5"><p className="text-[0.56rem] text-slate-600 uppercase">Umsatzwachstum</p><p className={`mt-1 font-mono text-xs ${company.growth >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{company.growth >= 0 ? "+" : ""}{(company.growth * 100).toFixed(1)} %</p></div><div className="bg-[#111820] p-2.5"><p className="text-[0.56rem] text-slate-600 uppercase">Marge</p><p className="mt-1 font-mono text-xs text-slate-300">{(company.profitMargin * 100).toFixed(1)} %</p></div><div className="bg-[#111820] p-2.5"><p className="text-[0.56rem] text-slate-600 uppercase">Fairer Wert</p><p className={`mt-1 font-mono text-xs ${upside >= 0 ? "text-cyan-300" : "text-amber-300"}`}>{upside >= 0 ? "+" : ""}{upside.toFixed(1)} %</p></div></div>
      <div className="p-4 sm:p-5">
        <div className="rounded-xl bg-white/[0.03] p-3"><div className="flex items-start gap-2"><Icon name="activity" size={14} className="mt-0.5 shrink-0 text-cyan-300" /><div><p className="text-[0.62rem] font-semibold tracking-wide text-slate-500 uppercase">Warum bewegt sich der Kurs?</p><p className="mt-1 text-[0.68rem] leading-4 text-slate-400">{company.lastReason}</p></div></div></div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div><p className="text-[0.6rem] text-slate-600 uppercase">Marktkapitalisierung</p><p className="mt-1 font-mono text-slate-300">{compactMoney(marketCap)}</p></div><div><p className="text-[0.6rem] text-slate-600 uppercase">Deine Position</p><p className="mt-1 font-mono text-slate-300">{company.ownedShares.toLocaleString("de-DE")} · {compactMoney(holdingValue)}</p>{ownedPercent > 0 ? <p className="mt-0.5 text-[0.58rem] text-cyan-300">{ownedPercent.toFixed(3)} % Beteiligung</p> : null}</div></div>
        <div className="mt-4 flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-black/15 p-1.5"><button type="button" aria-label="Ordermenge verringern" onClick={() => setShares(Math.max(1, Math.floor(shares / 10)))} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white"><Icon name="minus" size={13} /></button><div className="min-w-0 flex-1 text-center"><p className="font-mono text-xs text-slate-200">{shares.toLocaleString("de-DE")} Aktien</p><p className="mt-0.5 text-[0.56rem] text-slate-600">{compactMoney(cost)} Orderwert</p></div><button type="button" aria-label="Ordermenge erhöhen" onClick={() => setShares(Math.min(100_000, shares * 10))} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white"><Icon name="plus" size={13} /></button></div>
        <div className="mt-2 grid grid-cols-2 gap-2"><ActionButton disabled={state.cash < cost || company.status !== "active"} onClick={() => dispatch({ type: "BUY_STOCK", competitorId: company.id, shares })}>Kaufen</ActionButton><ActionButton variant="secondary" disabled={company.ownedShares < shares || company.status !== "active"} onClick={() => dispatch({ type: "SELL_STOCK", competitorId: company.id, shares })}>Verkaufen</ActionButton></div>
      </div>
    </Panel>
  );
}

export function StocksSection({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const portfolio = portfolioValue(state);
  const active = state.competitors.filter((company) => company.status === "active");
  const totalMarketCap = active.reduce((sum, company) => sum + company.price * company.sharesOutstanding, 0);
  const holdingCount = active.filter((company) => company.ownedShares > 0).length;

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Kapitalmarkt" title="Tech-Börse" description="Keine zufälligen Kurse: Bewertung folgt Umsatz, Marge, Wachstum, Innovation, Schulden und Nachrichten." action={<StatusBadge tone="success" dot>MARKT GEÖFFNET</StatusBadge>} />
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4"><MetricCard label="Portfolio" value={compactMoney(portfolio)} detail={`${holdingCount} Beteiligungen`} tone="violet" icon={<Icon name="briefcase" size={17} />} /><MetricCard label="Verfügbares Cash" value={compactMoney(state.cash)} detail="Für Orders und Betrieb" tone="cyan" icon={<Icon name="wallet" size={17} />} /><MetricCard label="Beobachteter Markt" value={compactMoney(totalMarketCap)} detail={`${active.length} aktive Unternehmen`} icon={<Icon name="building" size={17} />} /><MetricCard label="Eigene Aktie" value={money.format(state.sharePrice)} detail={`${compactMoney(state.valuation)} Bewertung`} tone="green" icon={<Icon name="stocks" size={17} />} /></div>
      <Panel className="overflow-hidden">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:items-center"><div><StatusBadge tone="info">EIGENES UNTERNEHMEN · CFRG</StatusBadge><h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-white">{money.format(state.sharePrice)} <span className="text-sm font-normal text-slate-600">je Aktie</span></h2><p className="mt-2 text-xs leading-5 text-slate-500">Der Kurs ist dein geglätteter Fundamentalwert pro Aktie. Verwässerung, Schulden und Gewinn wirken direkt.</p><div className="mt-4 flex flex-wrap gap-2"><StatusBadge tone={state.lastMonthRevenue >= state.lastMonthExpenses ? "success" : "warning"}>{state.lastMonthRevenue >= state.lastMonthExpenses ? "Profitabel" : "Investitionsphase"}</StatusBadge><StatusBadge tone="violet">{state.unlockedTech.length} Technologien</StatusBadge><StatusBadge tone="neutral">{state.marketShare.toFixed(1)} % Marktanteil</StatusBadge></div></div><div className="h-36"><AreaChart values={state.history.length > 1 ? state.history.map((point) => point.valuation / state.totalShares) : [state.sharePrice * .88, state.sharePrice * .94, state.sharePrice]} height={144} positive label="Eigener Aktienkurs" /></div></div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">{active.map((company) => <StockCard key={company.id} company={company} state={state} dispatch={dispatch} />)}</div>
      <Panel variant="subtle"><PanelHeader title="So entstehen die Kurse" description="Ein transparentes Bewertungsmodell hält die Börse wirtschaftlich nachvollziehbar." /><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{[["1", "Fundamentaldaten", "Umsatz, Gewinn und Cashflow"],["2", "Multiples", "Wachstum, Marke und Branche"],["3", "Risiko", "Schulden und Ergebnisschwankung"],["4", "Annäherung", "Kurs bewegt sich zum fairen Wert"]].map(([step,title,text]) => <div key={step} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"><span className="font-mono text-[0.62rem] text-cyan-300">0{step}</span><p className="mt-2 text-xs font-medium text-slate-300">{title}</p><p className="mt-1 text-[0.65rem] text-slate-600">{text}</p></div>)}</div></Panel>
    </div>
  );
}

export function DealsSection({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const ownership = (state.founderShares / state.totalShares) * 100;
  const defenseCost = Math.max(125_000, state.valuation * 0.018);
  const active = state.competitors.filter((company) => company.status === "active");
  const completed = state.competitors.filter((company) => company.status !== "active");

  return (
    <div className="space-y-5">
      <SectionTitle eyebrow="Corporate Development" title="Deals, Fusionen & Kontrolle" description="Kaufe Fähigkeiten und Marktanteile – aber nur, wenn Synergien den Aufschlag und Integrationsrisiken rechtfertigen." action={<StatusBadge tone={state.takeoverRisk < 25 ? "success" : state.takeoverRisk < 55 ? "warning" : "danger"} dot>{Math.round(state.takeoverRisk)} % eigenes Übernahmerisiko</StatusBadge>} />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel className="relative overflow-hidden"><div className="absolute top-[-6rem] left-[-5rem] size-56 rounded-full bg-cyan-300/[0.055] blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center"><DonutGauge value={100 - state.takeoverRisk} label={`${Math.round(100 - state.takeoverRisk)}`} sublabel="SICHERHEIT" tone={state.takeoverRisk < 35 ? "#6ee7b7" : "#fbbf24"} /><div className="min-w-0 flex-1"><PanelHeader eyebrow="Eigene Kontrolle" title={controlInfo(ownership).label} description={`${ownership.toFixed(1)} % Gründeranteil · ${controlInfo(ownership).detail}`} /><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-lg bg-white/[0.03] p-2.5"><p className="text-[0.56rem] text-slate-600 uppercase">Bewertung</p><p className="mt-1 font-mono text-xs text-slate-300">{compactMoney(state.valuation)}</p></div><div className="rounded-lg bg-white/[0.03] p-2.5"><p className="text-[0.56rem] text-slate-600 uppercase">Marge</p><p className="mt-1 font-mono text-xs text-slate-300">{state.lastMonthRevenue ? (((state.lastMonthRevenue-state.lastMonthExpenses)/state.lastMonthRevenue)*100).toFixed(1) : "0"} %</p></div><div className="rounded-lg bg-white/[0.03] p-2.5"><p className="text-[0.56rem] text-slate-600 uppercase">Abwehr aktiv</p><p className="mt-1 font-mono text-xs text-slate-300">{state.takeoverDefenseDays} Tage</p></div></div></div></div></Panel>
        <Panel><PanelHeader eyebrow="Übernahmeabwehr" title="Poison-Pill-Programm" description="Rechtsberatung, Bezugsrechte und Investor Relations erschweren einen feindlichen Zugriff für 180 Tage." /><div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.035] p-3"><div><p className="text-xs text-amber-100">Einmalige Kosten</p><p className="mt-1 font-mono text-sm text-amber-300">{compactMoney(defenseCost)}</p></div><Icon name="shield" size={28} className="text-amber-300/50" /></div><ActionButton className="mt-4 w-full" variant="secondary" disabled={state.cash < defenseCost || state.takeoverDefenseDays > 0} onClick={() => dispatch({ type: "ACTIVATE_DEFENSE" })}>{state.takeoverDefenseDays > 0 ? `Abwehr aktiv · ${state.takeoverDefenseDays} Tage` : "Abwehr aktivieren"}</ActionButton></Panel>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between"><div><p className="text-[0.65rem] font-semibold tracking-[0.16em] text-cyan-300/75 uppercase">Deal-Pipeline</p><h2 className="mt-1 text-lg font-semibold text-slate-100">Übernahmekandidaten</h2></div><p className="hidden text-xs text-slate-600 sm:block">Freundlich: Cash + Integration · Fusion: weniger Cash + Verwässerung</p></div>
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {active.map((company) => {
            const marketCap = company.price * company.sharesOutstanding;
            const acquisitionPrice = marketCap * 1.28;
            const ownedValue = company.ownedShares * company.price;
            const netAcquisition = Math.max(0, acquisitionPrice - ownedValue);
            const mergerCash = netAcquisition * 0.46;
            const newShares = (netAcquisition * 0.54) / Math.max(0.01, state.sharePrice);
            const postMergerOwnership = (state.founderShares / (state.totalShares + newShares)) * 100;
            const strategicFit = Math.min(96, Math.round(company.innovation * .45 + company.brand * .25 + (1-company.debtRatio)*30));
            const antitrustBlocked = state.marketShare + company.marketShare > 60;
            return (
              <Panel key={company.id} padding="none" className="overflow-hidden">
                <div className="border-b border-white/[0.055] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl text-[0.68rem] font-bold" style={{ color: company.color, backgroundColor: `${company.color}16` }}>{company.ticker}</span><div><h3 className="text-sm font-semibold text-slate-100">{company.name}</h3><p className="mt-0.5 text-[0.65rem] text-slate-600">{company.sector}</p></div></div><StatusBadge tone={strategicFit >= 70 ? "success" : "warning"}>{strategicFit} % FIT</StatusBadge></div><p className="mt-3 text-xs leading-5 text-slate-500">{company.description}</p></div>
                <div className="p-4 sm:p-5"><div className="grid grid-cols-3 gap-2"><div><p className="text-[0.56rem] text-slate-600 uppercase">Kaufpreis</p><p className="mt-1 font-mono text-xs text-slate-300">{compactMoney(netAcquisition)}</p></div><div><p className="text-[0.56rem] text-slate-600 uppercase">Marge</p><p className="mt-1 font-mono text-xs text-slate-300">{(company.profitMargin*100).toFixed(1)} %</p></div><div><p className="text-[0.56rem] text-slate-600 uppercase">Anteil</p><p className="mt-1 font-mono text-xs text-slate-300">{((company.ownedShares/company.sharesOutstanding)*100).toFixed(2)} %</p></div></div><div className="mt-4 rounded-xl bg-emerald-300/[0.035] p-3"><div className="flex items-start gap-2"><Icon name="sparkles" size={14} className="mt-0.5 text-emerald-300" /><div><p className="text-[0.6rem] font-semibold text-emerald-200/60 uppercase">Erwartete Synergie</p><p className="mt-1 text-[0.68rem] text-emerald-100/70">{company.acquisitionPerk}</p></div></div></div>{antitrustBlocked ? <p className="mt-3 rounded-lg bg-amber-300/[0.06] px-2.5 py-2 text-[0.65rem] text-amber-200">Kartellrisiko: Der kombinierte Marktanteil läge über 60 %.</p> : null}<div className="mt-4 grid grid-cols-2 gap-2"><ActionButton disabled={antitrustBlocked || state.cash < netAcquisition} onClick={() => dispatch({ type: "ACQUIRE_COMPETITOR", competitorId: company.id })}>Übernehmen</ActionButton><ActionButton variant="secondary" disabled={antitrustBlocked || state.cash < mergerCash || ownership < 33.4} onClick={() => dispatch({ type: "MERGE_COMPETITOR", competitorId: company.id })}>Fusion</ActionButton></div><p className="mt-2 text-center text-[0.58rem] text-slate-600">Fusion: {compactMoney(mergerCash)} Cash · Gründeranteil danach ≈ {postMergerOwnership.toFixed(1)} %</p></div>
              </Panel>
            );
          })}
        </div>
      </div>

      {completed.length ? <Panel><PanelHeader title="Abgeschlossene Transaktionen" description="Integrierte Unternehmen und ihre dauerhaften Synergien." /><div className="mt-4 space-y-2">{completed.map((company) => <div key={company.id} className="flex items-center justify-between rounded-xl border border-emerald-300/10 bg-emerald-300/[0.03] p-3"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-emerald-300/10 text-[0.62rem] font-bold text-emerald-300">{company.ticker}</span><div><p className="text-xs font-medium text-slate-300">{company.name}</p><p className="mt-0.5 text-[0.62rem] text-slate-600">{company.acquisitionPerk}</p></div></div><StatusBadge tone="success">{company.status === "merged" ? "FUSIONIERT" : "ÜBERNOMMEN"}</StatusBadge></div>)}</div></Panel> : null}

      <Panel variant="subtle"><PanelHeader title="Deal-Disziplin" description="Akquisitionen sind eine Kapitalallokationsentscheidung, kein automatischer Gewinn." /><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{[["Aufschlag", "28 %", "Anteilseigner verlangen eine Kontrollprämie."],["Integration", "12 Monate", "Synergien brauchen Zeit und Managementkapazität."],["Finanzierung", "Cash / Aktien", "Mehr Aktien schonen Cash, verwässern aber Kontrolle."],["Kartellrecht", "> 60 %", "Zu viel Marktanteil erhöht regulatorisches Risiko."]].map(([title,value,text]) => <div key={title} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"><p className="text-[0.6rem] text-slate-600 uppercase">{title}</p><p className="mt-1 font-mono text-sm text-cyan-300">{value}</p><p className="mt-2 text-[0.65rem] leading-4 text-slate-600">{text}</p></div>)}</div></Panel>
    </div>
  );
}
