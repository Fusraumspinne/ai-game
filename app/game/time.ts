import type { ActiveGameSpeed, GameSpeed } from "./types";

export const BASE_GAME_DAY_MS = 1_000;
export const MAX_OFFLINE_DAYS = 360;
export const GAME_SPEED_OPTIONS = [0, 1, 5, 10] as const satisfies readonly GameSpeed[];

export interface SimulationPulse {
  intervalMs: number;
  days: number;
}

/**
 * At x1, one game day lasts one real second. Faster modes batch several
 * days into the same pulse so the UI only needs to render once per second.
 */
export function getSimulationPulse(speed: GameSpeed): SimulationPulse | null {
  if (speed === 0) return null;
  if (speed === 1) return { intervalMs: BASE_GAME_DAY_MS, days: 1 };
  if (speed === 5) return { intervalMs: BASE_GAME_DAY_MS, days: 5 };
  return { intervalMs: BASE_GAME_DAY_MS, days: 10 };
}

export function getOfflineSimulationDays(
  elapsedMs: number,
  maximumDays = MAX_OFFLINE_DAYS,
) {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(
    Math.max(0, Math.floor(maximumDays)),
    Math.floor(elapsedMs / BASE_GAME_DAY_MS),
  );
}

export function normalizeActiveGameSpeed(
  value: unknown,
  legacyScale = false,
): ActiveGameSpeed {
  if (value === 1 || value === 5 || value === 10) return value;
  if (legacyScale && value === 2) return 5;
  if (legacyScale && value === 4) return 10;
  return 1;
}

export function normalizeGameSpeed(
  value: unknown,
  legacyScale = false,
): GameSpeed {
  if (value === 0) return 0;
  return normalizeActiveGameSpeed(value, legacyScale);
}
