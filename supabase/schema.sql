-- ============================================================
-- Schema para Consolidador de Inventario · Pareto IIyIV
-- Ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- Consolidados guardados (snapshot de cada consolidación)
create table if not exists consolidados (
  id           uuid default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  titulo       text not null,
  total_general numeric,
  filas        jsonb not null  -- array de ConsolidadoRow
);

-- Cabeceras de los controles de inventario
create table if not exists controles (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  tipo           text not null check (tipo in ('Semanal', 'Quincenal', 'Mensual', 'Trimestral')),
  lugar          text not null,
  usuario        text not null,
  consolidado_id uuid references consolidados(id),
  observaciones  text
);

-- Ítems de cada control (producto por producto)
create table if not exists control_items (
  id                   uuid default gen_random_uuid() primary key,
  control_id           uuid not null references controles(id) on delete cascade,
  nme                  text not null,
  descripcion          text,
  talle                text,
  umd                  text,
  cantidad_inventario  numeric,
  cantidad_real        numeric,
  diferencia           numeric
);

-- Índices para consultas de historial
create index if not exists controles_created_at_idx on controles (created_at desc);
create index if not exists control_items_control_id_idx on control_items (control_id);

-- Desactivar RLS (herramienta interna — ajustar si se necesita multi-usuario)
alter table consolidados  disable row level security;
alter table controles     disable row level security;
alter table control_items disable row level security;
