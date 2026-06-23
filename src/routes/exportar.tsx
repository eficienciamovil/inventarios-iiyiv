import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Sheet as SheetIcon, Loader2, ExternalLink } from "lucide-react";
import {
  consolidadoToExportRows,
  exportToExcel,
  formatARS,
} from "@/lib/excel-processor";
import { exportToGoogleSheet } from "@/lib/sheets.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/exportar")({
  head: () => ({ meta: [{ title: "Exportar · Consolidador" }] }),
  component: Exportar,
});

function Exportar() {
  const { resultado } = useStore();
  const [busy, setBusy] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  if (!resultado) {
    return (
      <AppShell>
        <div className="text-center py-24">
          <h2 className="text-xl font-semibold">Sin datos</h2>
          <Link
            to="/"
            className="inline-flex mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Ir a cargar archivos
          </Link>
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

  async function enviarAGoogleSheets() {
    setBusy(true);
    setSheetUrl(null);
    try {
      const fecha = new Date().toLocaleDateString("es-AR").replace(/\//g, "-");
      const divergRows = divergencias.map((d) => ({
        Tipo: d.tipo,
        NME: d.NME,
        "Desc. Inventario": d.descInv,
        "Desc. Arancel": d.descAra,
        Total: d.total,
        Importe: d.importe,
        Observación: d.observacion,
      }));
      const res = await exportToGoogleSheet({
        title: `Consolidado inventario ${fecha}`,
        sheets: [
          { name: "Consolidado", rows: consolidadoToExportRows(rows) },
          { name: "Divergencias", rows: divergRows },
        ],
      });
      setSheetUrl(res.url);
      toast.success("Enviado a Google Sheets");
    } catch (e: any) {
      toast.error(e?.message || "Error enviando a Google Sheets");
    } finally {
      setBusy(false);
    }
  }

  const items = [
    {
      title: "Consolidado completo",
      desc: `${rows.length} artículos · ${formatARS(totalGeneral)}`,
      action: () =>
        exportToExcel(consolidadoToExportRows(rows), "consolidado.xlsx", "Consolidado"),
    },
    {
      title: "Solo Categoría A",
      desc: `${onlyA.length} artículos prioritarios`,
      action: () =>
        exportToExcel(consolidadoToExportRows(onlyA), "categoria-A.xlsx", "Cat A"),
    },
    {
      title: "Plan control semanal",
      desc: `${rows.filter((r) => r.Frecuencia === "Semanal").length} artículos`,
      action: () => exportFreq("Semanal", "control-semanal.xlsx"),
    },
    {
      title: "Plan control quincenal",
      desc: `${rows.filter((r) => r.Frecuencia === "Quincenal").length} artículos`,
      action: () => exportFreq("Quincenal", "control-quincenal.xlsx"),
    },
    {
      title: "Plan control mensual",
      desc: `${rows.filter((r) => r.Frecuencia === "Mensual").length} artículos`,
      action: () => exportFreq("Mensual", "control-mensual.xlsx"),
    },
    {
      title: "Plan control trimestral",
      desc: `${rows.filter((r) => r.Frecuencia === "Trimestral").length} artículos`,
      action: () => exportFreq("Trimestral", "control-trimestral.xlsx"),
    },
    {
      title: "Divergencias",
      desc: `${divergencias.length} hallazgos`,
      action: () =>
        exportToExcel(
          divergencias.map((d) => ({
            Tipo: d.tipo,
            NME: d.NME,
            "Desc. Inv.": d.descInv,
            "Desc. Ara.": d.descAra,
            Total: d.total,
            Importe: d.importe,
            Observación: d.observacion,
          })),
          "divergencias.xlsx",
          "Divergencias",
        ),
    },
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Exportar</h1>
        <p className="text-muted-foreground mt-1.5">
          Descargá la base consolidada o planes de control específicos
        </p>
      </div>

      <Card className="p-5 mb-6 border-primary/30 bg-primary/5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <SheetIcon className="h-4 w-4" /> Enviar a Google Sheets
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Crea un nuevo Sheet en tu Google Drive con el consolidado completo y las divergencias.
            </p>
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-primary hover:underline"
              >
                Abrir Sheet creado <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <Button onClick={enviarAGoogleSheets} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SheetIcon className="h-4 w-4" />
            )}
            {busy ? "Enviando…" : "Enviar a Google Sheets"}
          </Button>
        </div>
      </Card>

      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        Descargas en Excel
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => (
          <Card key={it.title} className="p-5 flex flex-col">
            <h3 className="font-semibold">{it.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 flex-1">{it.desc}</p>
            <Button onClick={it.action} className="mt-4 w-full" variant="outline">
              <Download className="h-4 w-4" /> Descargar Excel
            </Button>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
