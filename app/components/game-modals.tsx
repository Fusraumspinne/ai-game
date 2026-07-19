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
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#03070b]/82 p-3 backdrop-blur-sm sm:p-6" role="presentation">
      <div
        ref={frameRef}
        role="dialog"
        aria-modal="true"
        className={`relative my-auto w-full ${width} overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_28px_100px_rgba(0,0,0,.55)]`}
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500"
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
        <h1 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
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
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">Willkommen zurück</h2>
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
          <div className="mt-4 rounded-xl bg-indigo-50/[0.055] p-3 text-xs text-indigo-700">
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
        <h2 className="mt-4 text-xl font-semibold text-white">Spielstand & Einstellungen</h2>
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
            className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-[0.68rem] text-slate-700 outline-none placeholder:text-slate-700 focus:border-blue-300/40"
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
