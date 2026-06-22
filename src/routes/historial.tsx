import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { ControlConItems } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Loader2, ChevronDown, ChevronRight, History } from "lucide-react";

const TIPO_COLOR: Record<string, string> = {
  Semanal: "bg-pareto-a/15 text-pareto-a",
  Quincenal: "bg-pareto-b/15 text-pareto-b",
  Mensual: "bg-pareto-c/20 text-foreground",
  Trimestral: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/historial")({
  head: () => ({ meta: [{ title: "Historial · Inventario" }] }),
  component: Historial,
});

function Historial() {
  const [controles, setControles] = useState<ControlConItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    supabase!
      .from("controles")
      .select("*, control_items(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setControles((data as ControlConItems[]) || []);
        setLoading(false);
      });
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <AppShell>
        <div className="text-center py-24">
          <h2 className="text-xl font-semibold">Supabase no configurado</h2>
          <p className="text-muted-foreground mt-2">
            Configurá las variables de entorno para ver el historial.
          </p>
        </div>
      </AppShell>
    );
  }

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const totalControles = controles.length;
  const totalDivergencias = controles.reduce(
    (sum, c) => sum + c.control_items.filter((i) => i.diferencia !== null && i.diferencia !== 0).length,
    0,
  );

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Historial de controles</h1>
          <p className="text-muted-foreground mt-1.5">
            {totalControles} controles registrados · {totalDivergencias} diferencias totales
          </p>
        </div>
        <Link
          to="/control"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          + Nuevo control
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="p-5 text-destructive">Error al cargar historial: {error}</Card>
      )}

      {!loading && !error && controles.length === 0 && (
        <Card className="p-10 text-center">
          <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay controles registrados todavía.</p>
          <Link
            to="/control"
            className="inline-flex mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Hacer el primer control
          </Link>
        </Card>
      )}

      <div className="space-y-3">
        {controles.map((ctrl) => {
          const isOpen = expanded.has(ctrl.id);
          const items = ctrl.control_items;
          const conDif = items.filter((i) => i.diferencia !== null && i.diferencia !== 0).length;
          const sinContar = items.filter((i) => i.cantidad_real === null).length;
          const fecha = new Date(ctrl.created_at).toLocaleString("es-AR", {
            dateStyle: "short",
            timeStyle: "short",
          });

          return (
            <Card key={ctrl.id} className="overflow-hidden">
              {/* Fila cabecera colapsable */}
              <button
                onClick={() => toggleExpand(ctrl.id)}
                className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <span className={`inline-flex shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${TIPO_COLOR[ctrl.tipo] || ""}`}>
                    {ctrl.tipo}
                  </span>
                  <span className="font-medium truncate">{ctrl.lugar}</span>
                  <span className="text-muted-foreground text-sm shrink-0">{ctrl.usuario}</span>
                  <span className="text-muted-foreground text-xs shrink-0">{fecha}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{items.length} ítems</span>
                  {sinContar > 0 && (
                    <span className="inline-flex rounded px-2 py-0.5 text-xs bg-warning/20 text-warning-foreground">
                      {sinContar} sin contar
                    </span>
                  )}
                  {conDif > 0 && (
                    <span className="inline-flex rounded px-2 py-0.5 text-xs font-semibold bg-destructive/15 text-destructive">
                      {conDif} dif.
                    </span>
                  )}
                  {conDif === 0 && sinContar === 0 && (
                    <span className="inline-flex rounded px-2 py-0.5 text-xs font-semibold bg-success/15 text-success">
                      OK
                    </span>
                  )}
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>

              {/* Detalle expandido */}
              {isOpen && (
                <div className="border-t overflow-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium">NME</th>
                        <th className="px-3 py-2 font-medium">Descripción</th>
                        <th className="px-3 py-2 font-medium">Talle</th>
                        <th className="px-3 py-2 font-medium">UMD</th>
                        <th className="px-3 py-2 font-medium text-right">Inventario</th>
                        <th className="px-3 py-2 font-medium text-right">Real</th>
                        <th className="px-3 py-2 font-medium text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const dif = item.diferencia;
                        const rowBg = dif !== null && dif !== 0 ? "bg-destructive/5" : "";
                        const difStyle =
                          dif === null
                            ? "text-muted-foreground"
                            : dif === 0
                              ? "text-success"
                              : dif > 0
                                ? "text-blue-500 font-semibold"
                                : "text-destructive font-semibold";
                        return (
                          <tr key={item.id} className={`border-t ${rowBg}`}>
                            <td className="px-3 py-1.5 font-mono">{item.nme}</td>
                            <td className="px-3 py-1.5 max-w-[180px] truncate">
                              {item.descripcion || "—"}
                            </td>
                            <td className="px-3 py-1.5">{item.talle || "—"}</td>
                            <td className="px-3 py-1.5">{item.umd || "—"}</td>
                            <td className="px-3 py-1.5 text-right">
                              {item.cantidad_inventario ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {item.cantidad_real ?? <span className="text-muted-foreground">—</span>}
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
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
