"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import type { GameAction, SimulationSummary } from "@/app/game/types";
import { Icon } from "./icons";
import { ActionButton, StatusBadge } from "./game-ui";

function ModalFrame({
  children,
  onClose,
  width = "max-w-xl",
  closeLabel = "Dialog schließen",
}: {
  children: ReactNode;
  onClose?: () => void;
  width?: string;
  closeLabel?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const first = frame?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex='0']");
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-6" role="presentation">
      <div
        ref={frameRef}
        role="dialog"
        aria-modal="true"
        className={`relative my-auto w-full ${width} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.25)]`}
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500"
            aria-label={closeLabel}
          >
            <Icon name="x" size={17} />
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function OnboardingModal({ dispatch }: { dispatch: Dispatch<GameAction> }) {
  return (
    <ModalFrame width="max-w-2xl">
      <div className="relative overflow-hidden border-b border-slate-200 px-6 pt-8 pb-7 sm:px-9 sm:pt-10">
        <div className="absolute top-[-9rem] right-[-7rem] size-72 rounded-full bg-blue-500/[0.08] blur-3xl" />
        <StatusBadge tone="info" dot>JANUAR 1984 · GARAGENPHASE</StatusBadge>
        <h1 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
          Eine kleine Werkstatt.
          <br />
          <span className="text-blue-600">Eine große Zukunft.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
          Circuit Forge baut einfache Heimcomputer. Deine Entscheidungen machen daraus einen
          Weltkonzern – oder eine Fußnote der Technikgeschichte.
        </p>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-8">
        {[
          {
            icon: "research" as const,
            title: "Einzelwerte erforschen",
            text: "Verbessere Kerne, Takt, Kapazität und Effizienz unabhängig voneinander.",
          },
          {
            icon: "monitor" as const,
            title: "Eigene PCs bauen",
            text: "Kombiniere erforschte Kerne, Takte, Kapazitäten und Effizienzwerte.",
          },
          {
            icon: "trendUp" as const,
            title: "Verkaufen & wachsen",
            text: "Nutze den Gewinn für Team, Produktion und die nächste Generation.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
              <Icon name={item.icon} size={18} />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{item.text}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col-reverse items-center justify-between gap-4 border-t border-slate-200 px-6 py-5 sm:flex-row sm:px-8">
        <p className="text-center text-[0.68rem] text-slate-600 sm:text-left">
          Spielstand wird automatisch lokal in deinem Browser gespeichert.
        </p>
        <ActionButton onClick={() => dispatch({ type: "DISMISS_ONBOARDING" })} size="lg">
          Unternehmen gründen
          <Icon name="arrowUpRight" size={16} />
        </ActionButton>
      </div>
    </ModalFrame>
  );
}

export function GuideModal({ onClose }: { onClose: () => void }) {
  const sections = [
    {
      icon: "monitor" as const,
      title: "1. Produkt entwickeln",
      text: "Erforsche einzelne CPU-, GPU-, RAM-, Speicher- und Plattformwerte. Stelle danach im PC-Labor einen kompatiblen Low-End-, Mid-Range- oder High-End-PC zusammen. Ein schneller Chip braucht auch Mainboard, Netzteil und Kühlung auf passendem Niveau.",
    },
    {
      icon: "trendUp" as const,
      title: "2. Nachfrage gewinnen",
      text: "Jedes Segment besitzt einen gemeinsamen Markt. Leistung, Preis, Qualität, Marke und Vertriebsreichweite entscheiden, welchen Anteil dein Modell gegen alle Konkurrenten erhält. Zu alte oder zu teure PCs verlieren Absatz.",
    },
    {
      icon: "production" as const,
      title: "3. Produktion ausbalancieren",
      text: "Fabrik, Automatisierung und Produktionspersonal begrenzen gemeinsam den Ausstoß. Verkaufte Geräte können direkt ausgeliefert werden; Überschüsse belegen das Lager. Zu viel Bestand bindet Kapital, zu wenig Produktion erzeugt verlorene Verkäufe.",
    },
    {
      icon: "people" as const,
      title: "4. Unternehmen skalieren",
      text: "Produktion, Forschung, Marketing, Vertrieb und Finanzen brauchen passende Teams und Abteilungsstufen. Sehr große Belegschaften ohne Infrastruktur kosten Geld, liefern aber kaum zusätzlichen Nutzen.",
    },
    {
      icon: "marketing" as const,
      title: "5. Marke aufbauen",
      text: "Marketing erhöht Bekanntheit und Reichweite mit abnehmendem Grenznutzen. Das sinnvolle Budget wächst mit dem adressierbaren Markt. Kampagnen helfen zeitweise, ersetzen aber kein konkurrenzfähiges Produkt.",
    },
    {
      icon: "finance" as const,
      title: "6. Kapital finanzieren",
      text: "Kredite erhalten deine Stimmrechte, verursachen aber Zinsen. Neue Aktien bringen Cash und besseren Kapitalmarktzugang, verwässern jedoch Kontrolle und werden mit Emissionsabschlag verkauft. Rückkäufe kosten eine Prämie, erhöhen aber Anteil und Entscheidungstempo.",
    },
    {
      icon: "stocks" as const,
      title: "7. Aktien investieren",
      text: "Kurse folgen Umsatz, Marge, Wachstum, Verschuldung, Produktzyklen und Marktstimmung. Große Orders bewegen Kauf- und Verkaufskurs. Profitable Beteiligungen zahlen monatliche Dividenden; bei einer Insolvenz werden die Aktien wertlos.",
    },
    {
      icon: "deals" as const,
      title: "8. Konkurrenten übernehmen",
      text: "Bereits gehaltene Aktien reduzieren den späteren Übernahmepreis. Eine Fusion schont Cash, gibt aber neue eigene Aktien aus. Kartellrecht und dein Gründeranteil können Transaktionen blockieren.",
    },
  ];

  return (
    <ModalFrame onClose={onClose} width="max-w-4xl" closeLabel="Spielanleitung schließen">
      <div className="max-h-[88vh] overflow-y-auto">
        <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Icon name="help" size={19} />
          </span>
          <p className="mt-4 text-[0.62rem] font-semibold tracking-[0.15em] text-blue-600 uppercase">Spielanleitung</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950">Vom Garagen-PC zum Technologiekonzern</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Dein Ziel ist kein festes Endlevel: Baue ein dauerhaft profitables Unternehmen auf, halte technologisch mit der Konkurrenz Schritt und entscheide, ob du Wachstum mit Gewinnen, Krediten oder Eigentum finanzierst.
          </p>
        </div>

        <div className="p-5 sm:p-8">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-900">Schnellstart</p>
            <p className="mt-1.5 text-xs leading-5 text-blue-800/80">
              Prüfe zuerst Preis und Tagesnachfrage des Start-PCs. Halte Produktion knapp über dem erwarteten Absatz, erforsche eine ausgewogene nächste Komponente und erweitere Personal oder Gebäude nur dort, wo tatsächlich ein Engpass angezeigt wird.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sections.map((section) => (
              <div key={section.title} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon name={section.icon} size={16} />
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                </div>
                <p className="mt-2.5 text-xs leading-5 text-slate-600">{section.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[0.62rem] font-semibold text-slate-700 uppercase">Zeit</p><p className="mt-1 text-xs leading-5 text-slate-500">1× entspricht einem Spieltag pro Sekunde. 5× und 10× beschleunigen, Pause stoppt die Simulation.</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[0.62rem] font-semibold text-slate-700 uppercase">Buchhaltung</p><p className="mt-1 text-xs leading-5 text-slate-500">Jahresansichten zeigen Umsatz, Kosten, Gewinn, Unternehmenswert, Cash und Marktanteil seit der Gründung.</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[0.62rem] font-semibold text-slate-700 uppercase">Speichern</p><p className="mt-1 text-xs leading-5 text-slate-500">Der Spielstand wird lokal gespeichert. Unter Einstellungen kannst du JSON-Backups exportieren oder importieren.</p></div>
          </div>

          <div className="mt-6 flex justify-end">
            <ActionButton onClick={onClose}>Verstanden</ActionButton>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}

export function OfflineModal({
  summary,
  onClose,
}: {
  summary: SimulationSummary;
  onClose: () => void;
}) {
  const format = (value: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  return (
    <ModalFrame onClose={onClose} width="max-w-lg">
      <div className="p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-600">
          <Icon name="clock" size={21} />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Willkommen zurück</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Dein Unternehmen war {summary.days} Spieltage aktiv. Produktion, Forschung und Markt wurden vollständig weitergerechnet.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          {[
            ["Umsatz", format(summary.revenue), "text-slate-900"],
            ["Gewinn", format(summary.profit), summary.profit >= 0 ? "text-emerald-700" : "text-rose-700"],
            ["Kosten", format(summary.expenses), "text-slate-900"],
            ["Forschung", `+${Math.round(summary.researchPoints)} FP`, "text-indigo-600"],
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-[0.65rem] tracking-wide text-slate-500 uppercase">{label}</p>
              <p className={`mt-1.5 font-mono text-base font-semibold ${tone}`}>{value}</p>
            </div>
          ))}
        </div>
        {summary.completedResearch.length ? (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-700">
            Forschung abgeschlossen: {summary.completedResearch.join(", ")}
          </div>
        ) : null}
        <ActionButton className="mt-6 w-full" size="lg" onClick={onClose}>Weiterführen</ActionButton>
      </div>
    </ModalFrame>
  );
}

export function SettingsModal({
  onClose,
  onExport,
  onImport,
  onReset,
}: {
  onClose: () => void;
  onExport: () => Promise<boolean>;
  onImport: (raw: string) => boolean;
  onReset: () => void;
}) {
  const [importValue, setImportValue] = useState("");
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <ModalFrame onClose={onClose} width="max-w-lg">
      <div className="border-b border-slate-200 p-6 sm:px-8">
        <span className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-700"><Icon name="settings" size={19} /></span>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">Spielstand & Einstellungen</h2>
        <p className="mt-1 text-xs text-slate-500">Deine Daten verlassen diesen Browser nicht.</p>
      </div>
      <div className="space-y-4 p-6 sm:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Spielstand exportieren</p>
              <p className="mt-1 text-xs text-slate-500">Kopiert ein Backup in die Zwischenablage.</p>
            </div>
            <ActionButton variant="secondary" onClick={async () => { const copied = await onExport(); setMessage(copied ? "Backup kopiert." : "Zwischenablage nicht verfügbar."); }}><Icon name="save" size={15} /> Export</ActionButton>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label htmlFor="save-import" className="text-sm font-medium text-slate-800">Backup importieren</label>
          <p className="mt-1 text-xs text-slate-500">Füge den zuvor exportierten JSON-Text ein.</p>
          <textarea
            id="save-import"
            value={importValue}
            onChange={(event) => setImportValue(event.target.value)}
            rows={3}
            placeholder="{ ... }"
            className="mt-3 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-[0.68rem] text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <ActionButton
            className="mt-2"
            variant="secondary"
            disabled={!importValue.trim()}
            onClick={() => setMessage(onImport(importValue) ? "Backup geladen." : "Ungültiger Spielstand.")}
          >
            Importieren
          </ActionButton>
        </div>
        <div className="rounded-2xl border border-rose-300/10 bg-rose-300/[0.025] p-4">
          <p className="text-sm font-medium text-slate-800">Neues Unternehmen</p>
          <p className="mt-1 text-xs text-slate-500">Setzt Fortschritt und lokalen Spielstand vollständig zurück.</p>
          {!confirmReset ? (
            <ActionButton className="mt-3" variant="danger" onClick={() => setConfirmReset(true)}>Zurücksetzen</ActionButton>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <ActionButton variant="danger" onClick={onReset}>Ja, neu beginnen</ActionButton>
              <ActionButton variant="ghost" onClick={() => setConfirmReset(false)}>Abbrechen</ActionButton>
            </div>
          )}
        </div>
        {message ? <p className="text-center text-xs text-blue-600">{message}</p> : null}
      </div>
    </ModalFrame>
  );
}
