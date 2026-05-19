// Simple store shared across routes, persisted in sessionStorage so navigations/reloads no lo vacían
import type { ArancelRow, InventarioRow, ConsolidadoResult } from "./excel-processor";

type State = {
  aranceles: ArancelRow[] | null;
  inventario: InventarioRow[] | null;
  resultado: ConsolidadoResult | null;
};

const STORAGE_KEY = "consolidador:v1";
const isBrowser = typeof window !== "undefined";

function load(): State {
  if (!isBrowser) return { aranceles: null, inventario: null, resultado: null };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { aranceles: null, inventario: null, resultado: null };
    return JSON.parse(raw) as State;
  } catch {
    return { aranceles: null, inventario: null, resultado: null };
  }
}

function save(s: State) {
  if (!isBrowser) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore (quota, etc.)
  }
}

let state: State = load();
const listeners = new Set<() => void>();
const emptySnapshot: State = { aranceles: null, inventario: null, resultado: null };

export const store = {
  get: () => state,
  set: (patch: Partial<State>) => {
    state = { ...state, ...patch };
    save(state);
    listeners.forEach((l) => l());
  },
  reset: () => {
    state = { aranceles: null, inventario: null, resultado: null };
    if (isBrowser) sessionStorage.removeItem(STORAGE_KEY);
    listeners.forEach((l) => l());
  },
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

import { useSyncExternalStore } from "react";
export function useStore(): State {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => state,
    () => emptySnapshot,
  );
}
