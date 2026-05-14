import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  readWorkbook, parseAranceles, parseInventario, consolidate,
} from "@/lib/excel-processor";
import { store, useStore } from "@/lib/store";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Cargar archivos · Consolidador" }] }),
  component: Home,
});

type Slot = "ara" | "inv";

function Home() {
  const nav = useNavigate();
  const state = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(slot: Slot, file: File) {
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const rows = readWorkbook(buf);
      if (slot === "ara") {
        const parsed = parseAranceles(rows);
        if (!parsed.data.length) {
          const detectados = parsed.headers.filter(Boolean).join(" · ") || "(ninguno)";
          throw new Error(`No se detectó la columna NME en aranceles. Encabezados detectados: ${detectados}.`);
        }
        store.set({ aranceles: parsed.data });
      } else {
        const parsed = parseInventario(rows);
        if (!parsed.data.length) {
          const detectados = parsed.headers.filter(Boolean).join(" · ") || "(ninguno)";
          throw new Error(`No se detectó la columna NME en inventario. Encabezados detectados: ${detectados}.`);
        }
        store.set({ inventario: parsed.data });
      }
    } catch (e: any) {
      setError(e?.message || "Error leyendo archivo");
    }
  }

  async function consolidar() {
    if (!state.aranceles || !state.inventario) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 50));
    try {
      const res = consolidate(state.aranceles, state.inventario);
      store.set({ resultado: res });
      nav({ to: "/dashboard" });
    } catch (e: any) {
      setError(e?.message || "Error consolidando");
    } finally {
      setBusy(false);
    }
  }

  const ready = !!state.aranceles && !!state.inventario;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Consolidación de inventario</h1>
        <p className="text-muted-foreground mt-1.5">
          Cruza aranceles e inventario por NME · valoriza · aplica Pareto · detecta divergencias
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <FileSlot
          title="Archivo de aranceles / precios"
          desc="Columnas: NME, Descripción, UMD, Importe, Fecha"
          loaded={state.aranceles?.length ?? null}
          onFile={(f) => handleFile("ara", f)}
        />
        <FileSlot
          title="Archivo de inventario / cargos"
          desc="Columnas: NME, Descripción, Talle, Nuevo, Usado, Rezago, B/Acta, Total"
          loaded={state.inventario?.length ?? null}
          onFile={(f) => handleFile("inv", f)}
        />
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5" /> {error}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border bg-card p-5">
        <div>
          <div className="font-medium">Procesar consolidación</div>
          <div className="text-sm text-muted-foreground">
            {ready
              ? `${state.aranceles!.length} aranceles · ${state.inventario!.length} ítems de inventario`
              : "Cargá ambos archivos para habilitar"}
          </div>
        </div>
        <Button size="lg" disabled={!ready || busy} onClick={consolidar}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Consolidar inventario
        </Button>
      </div>

      {state.aranceles && <Preview title="Vista previa · Aranceles" rows={state.aranceles.slice(0, 5)} cols={["NME","Descripcion","UMD","Importe","Fecha"]} />}
      {state.inventario && <Preview title="Vista previa · Inventario" rows={state.inventario.slice(0, 5)} cols={["NME","Descripcion","Talle","Nuevo","Usado","Rezago","BActa","Total"]} />}
    </AppShell>
  );
}

function FileSlot({
  title, desc, loaded, onFile,
}: { title: string; desc: string; loaded: number | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <Card
      className={`relative overflow-hidden transition-colors ${drag ? "border-primary bg-primary/5" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </div>
          {loaded !== null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 text-success px-2.5 py-1 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> {loaded} filas
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Sin cargar
            </span>
          )}
        </div>
        <button
          onClick={() => ref.current?.click()}
          className="mt-5 w-full border-2 border-dashed rounded-lg py-10 flex flex-col items-center gap-2 hover:border-primary hover:bg-accent/40 transition-colors"
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm font-medium">Arrastrá o hacé clic para subir</span>
          <span className="text-xs text-muted-foreground">.xlsx · .xls · .csv</span>
        </button>
        <input
          ref={ref}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </div>
    </Card>
  );
}

function Preview({ title, rows, cols }: { title: string; rows: any[]; cols: string[] }) {
  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold mb-2 text-muted-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{cols.map((c) => <th key={c} className="text-left px-3 py-2 font-medium">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {cols.map((c) => <td key={c} className="px-3 py-2">{String(r[c] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
