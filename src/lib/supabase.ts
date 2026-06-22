import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && key ? createClient(url, key) : null;
export const isSupabaseConfigured = !!supabase;

export type ControlRecord = {
  id: string;
  created_at: string;
  tipo: "Semanal" | "Quincenal" | "Mensual" | "Trimestral";
  lugar: string;
  usuario: string;
  consolidado_id: string | null;
  observaciones: string | null;
};

export type ControlItemRecord = {
  id: string;
  control_id: string;
  nme: string;
  descripcion: string | null;
  talle: string | null;
  umd: string | null;
  cantidad_inventario: number | null;
  cantidad_real: number | null;
  diferencia: number | null;
};

export type ControlConItems = ControlRecord & {
  control_items: ControlItemRecord[];
};
