// Simple in-memory store shared across routes via React context-less singleton + listeners
import type { ArancelRow, InventarioRow, ConsolidadoResult } from "./excel-processor";

type State = {
  aranceles: ArancelRow[] | null;
  inventario: InventarioRow[] | null;
  resultado: ConsolidadoResult | null;
};

let state: State = { aranceles: null, inventario: null, resultado: null };
const listeners = new Set<() => void>();

export const store = {
  get: () => state,
  set: (patch: Partial<State>) => {
    state = { ...state, ...patch };
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
    () => store.get(),
    () => store.get(),
  );
}
