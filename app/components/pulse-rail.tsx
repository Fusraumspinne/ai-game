import { PRODUCT_BLUEPRINTS, TECH_TREE } from "@/app/game/data";
import type { GameSection, GameState } from "@/app/game/types";
import { Icon } from "./icons";
import { ProgressBar, StatusBadge } from "./game-ui";

function newsTone(tone: string) {
  if (tone === "positive") return "bg-emerald-300";
  if (tone === "warning") return "bg-amber-300";
  if (tone === "critical") return "bg-rose-400";
  return "bg-cyan-300";
}

function pctChange(history: number[]) {
  if (history.length < 2) return 0;
  const previous = history[history.length - 2] || 1;
  return ((history[history.length - 1] - previous) / previous) * 100;
}

export function PulseRail({
  state,
  onNavigate,
}: {
  state: GameState;
  onNavigate: (section: GameSection) => void;
}) {
  const employeeCount = Object.values(state.employees).reduce((sum, value) => sum + value, 0);
  const currentTech = TECH_TREE.find((tech) => tech.id === state.currentResearch);
  const activeBlueprint = state.products
    .filter((product) => product.active)
    .map((product) => PRODUCT_BLUEPRINTS.find((blueprint) => blueprint.id === product.blueprintId))
    .filter(Boolean)[0];
  const milestones = [
    {
      label: "Erste neue Technologie",
      done: state.unlockedTech.length > 1,
      progress: Math.min(100, state.unlockedTech.length > 1 ? 100 : (state.researchPoints / 320) * 100),
      section: "research" as const,
    },
    {
      label: "Zweite Produktlinie",
      done: state.products.length > 1,
      progress: Math.min(100, state.products.length > 1 ? 100 : (state.cash / 78_000) * 100),
      section: "products" as const,
    },
    {
      label: "Team auf 25 ausbauen",
      done: employeeCount >= 25,
      progress: Math.min(100, (employeeCount / 25) * 100),
      section: "people" as const,
    },
  ];
  const movers = state.competitors
    .filter((competitor) => competitor.status === "active")
    .map((competitor) => ({ competitor, change: pctChange(competitor.history) }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 2);

  return (
    <div className="space-y-4 pb-6">
      <section className="rounded-2xl border border-white/[0.07] bg-[#111820]/95 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[0.63rem] font-semibold tracking-[0.16em] text-cyan-300/75 uppercase">
              Nächste Schritte
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-100">Garage → Unternehmen</h2>
          </div>
          <span className="font-mono text-xs text-slate-500">
            {milestones.filter((item) => item.done).length}/3
          </span>
        </div>
        <div className="space-y-3.5">
          {milestones.map((milestone, index) => (
            <button
              key={milestone.label}
              type="button"
              onClick={() => onNavigate(milestone.section)}
              className="group block w-full text-left focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className={`grid size-5 place-items-center rounded-full border text-[0.62rem] font-semibold ${
                    milestone.done
                      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-300"
                      : "border-white/10 bg-white/[0.03] text-slate-500"
                  }`}
                >
                  {milestone.done ? <Icon name="check" size={11} /> : index + 1}
                </span>
                <span className={`text-xs ${milestone.done ? "text-slate-500 line-through" : "text-slate-300 group-hover:text-white"}`}>
                  {milestone.label}
                </span>
              </div>
              <ProgressBar value={milestone.progress} size="sm" tone={milestone.done ? "green" : "cyan"} ariaLabel={milestone.label} />
            </button>
          ))}
        </div>
      </section>

      {currentTech || state.campaign ? (
        <section className="rounded-2xl border border-white/[0.07] bg-[#111820]/95 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Icon name="activity" size={15} className="text-cyan-300" />
            Läuft gerade
          </div>
          {currentTech ? (
            <button type="button" onClick={() => onNavigate("research")} className="block w-full rounded-xl bg-white/[0.035] p-3 text-left hover:bg-white/[0.055]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-slate-200">{currentTech.name}</span>
                <StatusBadge tone="violet">F&E</StatusBadge>
              </div>
              <ProgressBar
                className="mt-3"
                value={state.researchPoints}
                max={currentTech.cost}
                valueLabel={`${Math.min(100, Math.round((state.researchPoints / currentTech.cost) * 100))} %`}
                tone="violet"
                size="sm"
              />
            </button>
          ) : null}
          {state.campaign ? (
            <button type="button" onClick={() => onNavigate("marketing")} className="mt-2 block w-full rounded-xl bg-white/[0.035] p-3 text-left hover:bg-white/[0.055]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-slate-200">{state.campaign.name}</span>
                <StatusBadge tone="warning">Kampagne</StatusBadge>
              </div>
              <ProgressBar className="mt-3" value={state.campaign.daysRemaining} max={state.campaign.totalDays} valueLabel={`${state.campaign.daysRemaining} Tage`} tone="amber" size="sm" />
            </button>
          ) : null}
        </section>
      ) : null}

      {(state.takeoverRisk >= 25 || state.cash < 25_000) && (
        <button
          type="button"
          onClick={() => onNavigate(state.takeoverRisk >= 25 ? "deals" : "finance")}
          className="flex w-full items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.055] p-4 text-left hover:bg-amber-300/[0.08]"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-300">
            <Icon name="alert" size={17} />
          </span>
          <span>
            <strong className="block text-xs font-semibold text-amber-100">
              {state.takeoverRisk >= 25 ? "Kontrolle unter Druck" : "Liquidität wird knapp"}
            </strong>
            <span className="mt-1 block text-[0.68rem] leading-4 text-amber-100/55">
              {state.takeoverRisk >= 25
                ? `${Math.round(state.takeoverRisk)} % Übernahmerisiko – prüfe Abwehrmaßnahmen.`
                : "Weniger als 25.000 € Reserve. Kosten senken oder Finanzierung sichern."}
            </span>
          </span>
        </button>
      )}

      <section className="rounded-2xl border border-white/[0.07] bg-[#111820]/95 p-4">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Icon name="news" size={15} className="text-slate-400" />
            Newsroom
          </div>
          <span className="size-1.5 animate-pulse rounded-full bg-cyan-300 motion-reduce:animate-none" />
        </div>
        <div>
          {state.news.slice(0, 4).map((item) => (
            <article key={item.id} className="relative border-b border-white/[0.055] py-3 pl-3 last:border-0 last:pb-0">
              <span className={`absolute top-4 left-0 size-1.5 rounded-full ${newsTone(item.tone)}`} />
              <p className="text-[0.7rem] font-medium leading-4 text-slate-300">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-[0.64rem] leading-4 text-slate-500">{item.body}</p>
              <p className="mt-1.5 font-mono text-[0.58rem] text-slate-600">
                {item.day === state.day ? "HEUTE" : `VOR ${Math.max(1, state.day - item.day)} TAGEN`}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[#111820]/95 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Icon name="stocks" size={15} className="text-slate-400" />
            Marktbewegungen
          </div>
          <button type="button" onClick={() => onNavigate("stocks")} className="text-[0.65rem] font-medium text-cyan-300 hover:text-cyan-200">
            Alle
          </button>
        </div>
        <div className="space-y-2">
          {movers.map(({ competitor, change }) => (
            <button key={competitor.id} type="button" onClick={() => onNavigate("stocks")} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] p-2.5 text-left hover:bg-white/[0.055]">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg text-[0.63rem] font-bold" style={{ backgroundColor: `${competitor.color}16`, color: competitor.color }}>
                {competitor.ticker}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.7rem] font-medium text-slate-300">{competitor.name}</span>
                <span className="block truncate text-[0.58rem] text-slate-600">{competitor.lastReason}</span>
              </span>
              <span className={`font-mono text-[0.7rem] font-semibold ${change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {change >= 0 ? "+" : ""}{change.toFixed(1)}%
              </span>
            </button>
          ))}
        </div>
      </section>

      {activeBlueprint ? (
        <p className="px-2 text-center text-[0.58rem] leading-4 text-slate-700">
          {activeBlueprint.name} wird anhand von Nachfrage, Preis, Marke und Konkurrenz simuliert.
        </p>
      ) : null}
    </div>
  );
}
