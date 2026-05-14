import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { consolidadoToExportRows, exportToExcel, formatARS } from "@/lib/excel-processor";

export const Route = createFileRoute("/exportar")({
  head: () => ({ meta: [{ title: "Exportar · Consolidador" }] }),
  component: Exportar,
});

function Exportar() {
  const { resultado } = useStore();
  if (!resultado) {
    return (
      <AppShell>
        <div className="text-center py-24">
          <h2 className="text-xl font-semibold">Sin datos</h2>
          <Link to="/" className="inline-flex mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Ir a cargar archivos</Link>
        </div>
      </AppShell>
    );
  }

  const { rows, divergencias, totalGeneral } = resultado;
  const onlyA = rows.filter((r) => r.Categoria === "A");

  const exportFreq = (freq: string, file: string) => {
    const subset = rows.filter((r) => r.Frecuencia === freq);
    exportToExcel(consolidadoToExportRows(subset), file, freq);
  };

  const items = [
    { title: "Consolidado completo", desc: `${rows.length} artículos · ${formatARS(totalGeneral)}`, action: () => exportToExcel(consolidadoToExportRows(rows), "consolidado.xlsx", "Consolidado") },
    { title: "Solo Categoría A", desc: `${onlyA.length} artículos prioritarios`, action: () => exportToExcel(consolidadoToExportRows(onlyA), "categoria-A.xlsx", "Cat A") },
    { title: "Plan control semanal", desc: `${rows.filter(r => r.Frecuencia === "Semanal").length} artículos`, action: () => exportFreq("Semanal", "control-semanal.xlsx") },
    { title: "Plan control quincenal", desc: `${rows.filter(r => r.Frecuencia === "Quincenal").length} artículos`, action: () => exportFreq("Quincenal", "control-quincenal.xlsx") },
    { title: "Plan control mensual", desc: `${rows.filter(r => r.Frecuencia === "Mensual").length} artículos`, action: () => exportFreq("Mensual", "control-mensual.xlsx") },
    { title: "Plan control trimestral", desc: `${rows.filter(r => r.Frecuencia === "Trimestral").length} artículos`, action: () => exportFreq("Trimestral", "control-trimestral.xlsx") },
    { title: "Divergencias", desc: `${divergencias.length} hallazgos`, action: () => exportToExcel(divergencias.map(d => ({ Tipo: d.tipo, NME: d.NME, "Desc. Inv.": d.descInv, "Desc. Ara.": d.descAra, Total: d.total, Importe: d.importe, Observación: d.observacion })), "divergencias.xlsx", "Divergencias") },
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Exportar</h1>
        <p className="text-muted-foreground mt-1.5">Descargá la base consolidada o planes de control específicos</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <Card key={it.title} className="p-5 flex flex-col">
            <h3 className="font-semibold">{it.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 flex-1">{it.desc}</p>
            <Button onClick={it.action} className="mt-4 w-full"><Download className="h-4 w-4" /> Descargar Excel</Button>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
