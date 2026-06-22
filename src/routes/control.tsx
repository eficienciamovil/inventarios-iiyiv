import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ClipboardCheck } from "lucide-react";

type TipoControl = "Semanal" | "Quincenal" | "Mensual" | "Trimestral";

const TIPO_COLOR: Record<TipoControl, string> = {
  Semanal: "bg-pareto-a/15 text-pareto-a",
  Quincenal: "bg-pareto-b/15 text-pareto-b",
  Mensual: "bg-pareto-c/20 text-foreground",
  Trimestral: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/control")({
  head: () => ({ meta: [{ title: "Control · Inventario" }] }),
  component: Control,
});

function Control() {
  const { resultado, consolidadoId } = useStore();
  const [tipo, setTipo] = useState<TipoControl>("Semanal");
  const [lugar, setLugar] = useState("");
  const [usuario, setUsuario] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ahora = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

  const productos = useMemo(() => {
    if (!resultado) return [];
    return resultado.rows.filter((r) => r.Frecuencia === tipo && r.Total !== null);
  }, [resultado, tipo]);

  if (!resultado) {
    return (
      <AppShell>
        <div className="text-center py-24">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Sin datos consolidados</h2>
          <p className="text-muted-foreground mt-2">Primero cargá los archivos Excel y consolidá el inventario.</p>
          <Link to="/" className="inline-flex mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Ir a cargar archivos
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AppShell>
        <div className="text-center py-24">
          <h2 className="text-xl font-semibold">Supabase no configurado</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Para guardar los controles creá un archivo <code className="bg-muted px-1 rounded">.env</code> con{" "}
            <code className="bg-muted px-1 rounded">VITE_SUPABASE_URL</code> y{" "}
            <code className="bg-muted px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </AppShell>
    );
  }

  async function guardarControl() {
    if (!lugar.trim() || !usuario.trim()) {
      setErrorMsg("Completá el lugar y el usuario antes de guardar.");
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const { data: ctrl, error: ctrlErr } = await supabase!
        .from("controles")
        .insert({
          tipo,
          lugar: lugar.trim(),
          usuario: usuario.trim(),
          consolidado_id: consolidadoId || null,
        })
        .select("id")
        .single();

      if (ctrlErr) throw ctrlErr;

      const items = productos.map((p) => {
        const raw = quantities[p.NME];
        const real = raw !== undefined && raw !== "" ? Number(raw) : null;
        const dif = real !== null && p.Total !== null ? real - p.Total : null;
        return {
          control_id: ctrl.id,
          nme: p.NME,
          descripcion: p.DescripcionInv || p.DescripcionAra || null,
          talle: p.Talle || null,
          umd: p.UMD || null,
          cantidad_inventario: p.Total,
          cantidad_real: real,
          diferencia: dif,
        };
      });

      const { error: itemsErr } = await supabase!.from("control_items").insert(items);
      if (itemsErr) throw itemsErr;

      setSavedId(ctrl.id);
      setQuantities({});
      toast.success(`Control ${tipo} guardado. ${items.length} artículos registrados.`);
    } catch (e: any) {
      const msg = e?.message || JSON.stringify(e) || "Error desconocido";
      setErrorMsg(`Error al guardar: ${msg}`);
      console.error("Supabase error:", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Control de inventario</h1>
        <p className="text-muted-foreground mt-1.5">
          Ingresá las cantidades reales para registrar las diferencias contra el inventario
        </p>
      </div>

      {/* Cabecera del control */}
      <Card className="p-5 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Datos del control
        </h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <Label className="mb-1.5 block">Tipo de control</Label>
            <select
              value={tipo}
              onChange={(e) => { setTipo(e.target.value as TipoControl); setSavedId(null); }}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {(["Semanal", "Quincenal", "Mensual", "Trimestral"] as TipoControl[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-1.5 block">Lugar</Label>
            <Input
              placeholder="Ej: Depósito Central"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Usuario</Label>
            <Input
              placeholder="Nombre del responsable"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Fecha y hora</Label>
            <div className="h-9 flex items-center text-sm border rounded-md px-3 bg-muted/30 text-muted-foreground">
              {ahora}
            </div>
          </div>
        </div>
      </Card>

      {/* Barra de acciones */}
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ${TIPO_COLOR[tipo]}`}>
            {tipo}
          </span>
          <span className="text-sm text-muted-foreground">
            {productos.length} artículos para controlar
          </span>
        </div>
        <Button onClick={guardarControl} disabled={busy || !!savedId}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : savedId ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : null}
          {savedId ? "Control guardado" : busy ? "Guardando…" : "Guardar control"}
        </Button>
      </div>

      {/* Tabla de productos */}
      {productos.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No hay artículos con frecuencia <strong>{tipo}</strong> en el consolidado actual.
        </Card>
      ) : (
        <div className="rounded-lg border bg-card overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
              <tr className="text-left text-xs">
                <th className="px-3 py-2.5 font-medium">NME</th>
                <th className="px-3 py-2.5 font-medium">Descripción</th>
                <th className="px-3 py-2.5 font-medium">Talle</th>
                <th className="px-3 py-2.5 font-medium">UMD</th>
                <th className="px-3 py-2.5 font-medium text-right">Inventario</th>
                <th className="px-3 py-2.5 font-medium text-center w-36">Cantidad real</th>
                <th className="px-3 py-2.5 font-medium text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const raw = quantities[p.NME];
                const real = raw !== undefined && raw !== "" ? Number(raw) : null;
                const dif = real !== null && p.Total !== null ? real - p.Total : null;
                const difStyle =
                  dif === null
                    ? "text-muted-foreground"
                    : dif === 0
                      ? "text-success font-medium"
                      : dif > 0
                        ? "text-blue-500 font-semibold"
                        : "text-destructive font-semibold";
                return (
                  <tr key={p.NME} className="border-t hover:bg-accent/20">
                    <td className="px-3 py-1.5 font-mono text-xs">{p.NME}</td>
                    <td className="px-3 py-1.5 max-w-[200px] truncate text-xs" title={p.DescripcionInv}>
                      {p.DescripcionInv || p.DescripcionAra}
                    </td>
                    <td className="px-3 py-1.5 text-xs">{p.Talle || "—"}</td>
                    <td className="px-3 py-1.5 text-xs">{p.UMD || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-medium">{p.Total}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        className="h-7 text-right w-28 mx-auto block"
                        placeholder="—"
                        value={raw ?? ""}
                        onChange={(e) =>
                          setQuantities((q) => ({ ...q, [p.NME]: e.target.value }))
                        }
                      />
                    </td>
                    <td className={`px-3 py-1.5 text-right ${difStyle}`}>
                      {dif === null ? "—" : dif > 0 ? `+${dif}` : dif}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {savedId && (
        <p className="mt-4 text-center text-sm">
          <Link to="/historial" className="text-primary hover:underline">
            Ver historial de controles →
          </Link>
        </p>
      )}
    </AppShell>
  );
}
