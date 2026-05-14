import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { exportToExcel, formatARS } from "@/lib/excel-processor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

export const Route = createFileRoute("/divergencias")({
  head: () => ({ meta: [{ title: "Divergencias · Consolidador" }] }),
  component: Divergencias,
});

function Divergencias() {
  const { resultado } = useStore();
  const [tipo, setTipo] = useState("all");
  const [q, setQ] = useState("");

  const tipos = useMemo(() => Array.from(new Set(resultado?.divergencias.map((d) => d.tipo) || [])), [resultado]);
  const filtered = useMemo(() => {
    if (!resultado) return [];
    const ql = q.toLowerCase();
    return resultado.divergencias.filter((d) => {
      if (tipo !== "all" && d.tipo !== tipo) return false;
      if (ql && !d.NME.toLowerCase().includes(ql) && !d.descInv.toLowerCase().includes(ql) && !d.descAra.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [resultado, tipo, q]);

  if (!resultado) return <AppShell><Empty /></AppShell>;

  function exportar() {
    exportToExcel(
      filtered.map((d) => ({
        Tipo: d.tipo, NME: d.NME, "Desc. Inventario": d.descInv,
        "Desc. Arancel": d.descAra, Total: d.total, Importe: d.importe, Observación: d.observacion,
      })),
      "divergencias.xlsx", "Divergencias",
    );
  }

  const counts = tipos.map((t) => ({ t, n: resultado.divergencias.filter((d) => d.tipo === t).length }));

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Informe de divergencias</h1>
          <p className="text-muted-foreground mt-1.5">{resultado.divergencias.length} hallazgos en total</p>
        </div>
        <Button onClick={exportar}><Download className="h-4 w-4" /> Exportar divergencias</Button>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {counts.map(({ t, n }) => (
          <Card key={t} className="p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t}</div>
            <div className="text-2xl font-bold mt-1 text-destructive">{n}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-2 gap-3">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="all">Todos los tipos</option>
            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input placeholder="Buscar NME o descripción…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>

      <div className="overflow-auto rounded-lg border bg-card max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr className="text-left">
              {["Tipo","NME","Descripción Inv.","Descripción Ara.","Total","Importe","Observación"].map((h) =>
                <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2"><span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">{d.tipo}</span></td>
                <td className="px-3 py-2 font-mono">{d.NME}</td>
                <td className="px-3 py-2 max-w-[260px] truncate" title={d.descInv}>{d.descInv}</td>
                <td className="px-3 py-2 max-w-[260px] truncate" title={d.descAra}>{d.descAra}</td>
                <td className="px-3 py-2 text-right">{d.total ?? "—"}</td>
                <td className="px-3 py-2 text-right">{d.importe !== null ? formatARS(d.importe) : "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{d.observacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Empty() {
  return (
    <div className="text-center py-24">
      <h2 className="text-xl font-semibold">Sin datos</h2>
      <Link to="/" className="inline-flex mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Ir a cargar archivos</Link>
    </div>
  );
}
