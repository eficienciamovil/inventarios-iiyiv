import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { formatARS } from "@/lib/excel-processor";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/consolidado")({
  head: () => ({ meta: [{ title: "Consolidado · Inventario" }] }),
  component: Consolidado,
});

function Consolidado() {
  const { resultado } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [freq, setFreq] = useState<string>("all");
  const [estado, setEstado] = useState<string>("all");
  const [minVal, setMinVal] = useState<string>("");

  const filtered = useMemo(() => {
    if (!resultado) return [];
    const ql = q.trim().toLowerCase();
    const min = parseFloat(minVal) || 0;
    return resultado.rows.filter((r) => {
      if (cat !== "all" && r.Categoria !== cat) return false;
      if (freq !== "all" && r.Frecuencia !== freq) return false;
      if (estado !== "all" && r.EstadoCruce !== estado) return false;
      if (min > 0 && r.ValorTotal < min) return false;
      if (ql && !r.NME.toLowerCase().includes(ql) && !r.DescripcionInv.toLowerCase().includes(ql) && !r.DescripcionAra.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [resultado, q, cat, freq, estado, minVal]);

  if (!resultado) return <AppShell><Empty /></AppShell>;

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Consolidado</h1>
          <p className="text-muted-foreground mt-1.5">{filtered.length.toLocaleString("es-AR")} de {resultado.rows.length.toLocaleString("es-AR")} artículos</p>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-5 gap-3">
          <Input placeholder="Buscar NME o descripción…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={cat} onChange={setCat} options={[["all","Toda categoría"],["A","Categoría A"],["B","Categoría B"],["C","Categoría C"],["N/V","No valorizables"]]} />
          <Select value={freq} onChange={setFreq} options={[["all","Toda frecuencia"],["Semanal","Semanal"],["Quincenal","Quincenal"],["Mensual","Mensual"],["Trimestral","Trimestral"]]} />
          <Select value={estado} onChange={setEstado} options={[["all","Todo estado"],["OK","OK"],["Sin arancel","Sin arancel"],["Sin inventario","Sin inventario"],["No valorizable","No valorizable"]]} />
          <Input placeholder="Valor mínimo $" inputMode="numeric" value={minVal} onChange={(e) => setMinVal(e.target.value)} />
        </div>
      </Card>

      <div className="overflow-auto rounded-lg border bg-card max-h-[70vh]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
            <tr className="text-left">
              {["NME","Descripción Inv.","Descripción Ara.","UMD","Talle","N","U","R","B/A","Total","Importe","Fecha","Valor Total","%","% Acum.","Cat.","Frecuencia","Estado","Obs."].map((h) => (
                <th key={h} className="px-2.5 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.NME} className="border-t hover:bg-accent/30">
                <td className="px-2.5 py-1.5 font-mono">{r.NME}</td>
                <td className="px-2.5 py-1.5 max-w-[220px] truncate" title={r.DescripcionInv}>{r.DescripcionInv}</td>
                <td className="px-2.5 py-1.5 max-w-[220px] truncate" title={r.DescripcionAra}>{r.DescripcionAra}</td>
                <td className="px-2.5 py-1.5">{r.UMD}</td>
                <td className="px-2.5 py-1.5">{r.Talle}</td>
                <td className="px-2.5 py-1.5 text-right">{r.Nuevo}</td>
                <td className="px-2.5 py-1.5 text-right">{r.Usado}</td>
                <td className="px-2.5 py-1.5 text-right">{r.Rezago}</td>
                <td className="px-2.5 py-1.5 text-right">{r.BActa}</td>
                <td className="px-2.5 py-1.5 text-right font-medium">{r.Total ?? "—"}</td>
                <td className="px-2.5 py-1.5 text-right">{r.Importe !== null ? formatARS(r.Importe) : "—"}</td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{r.Fecha}</td>
                <td className="px-2.5 py-1.5 text-right font-semibold">{formatARS(r.ValorTotal)}</td>
                <td className="px-2.5 py-1.5 text-right text-muted-foreground">{r.Porcentaje.toFixed(2)}%</td>
                <td className="px-2.5 py-1.5 text-right text-muted-foreground">{r.PorcentajeAcum.toFixed(1)}%</td>
                <td className="px-2.5 py-1.5"><CatBadge c={r.Categoria} /></td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{r.Frecuencia}</td>
                <td className="px-2.5 py-1.5"><EstadoBadge s={r.EstadoCruce} /></td>
                <td className="px-2.5 py-1.5 text-warning">{r.Observaciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function CatBadge({ c }: { c: string }) {
  const map: Record<string, string> = {
    A: "bg-pareto-a/15 text-pareto-a",
    B: "bg-pareto-b/15 text-pareto-b",
    C: "bg-pareto-c/20 text-foreground",
    "N/V": "bg-muted text-muted-foreground",
  };
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${map[c]}`}>{c}</span>;
}

function EstadoBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    OK: "bg-success/15 text-success",
    "Sin arancel": "bg-warning/20 text-warning-foreground",
    "Sin inventario": "bg-warning/20 text-warning-foreground",
    "No valorizable": "bg-destructive/15 text-destructive",
  };
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${map[s] || ""}`}>{s}</span>;
}

function Empty() {
  return (
    <div className="text-center py-24">
      <h2 className="text-xl font-semibold">Sin datos consolidados</h2>
      <Link to="/" className="inline-flex mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Ir a cargar archivos</Link>
    </div>
  );
}
