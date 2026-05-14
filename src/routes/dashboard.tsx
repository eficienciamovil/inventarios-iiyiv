import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { formatARS } from "@/lib/excel-processor";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Consolidador" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { resultado } = useStore();
  if (!resultado) return <AppShell><Empty /></AppShell>;

  const { rows, totalGeneral, divergencias } = resultado;
  const cntA = rows.filter((r) => r.Categoria === "A").length;
  const cntB = rows.filter((r) => r.Categoria === "B").length;
  const cntC = rows.filter((r) => r.Categoria === "C").length;
  const cntNV = rows.filter((r) => r.Categoria === "N/V").length;
  const top20 = rows.slice(0, 20);
  const concentracionA = rows.filter((r) => r.Categoria === "A").reduce((s, r) => s + r.Porcentaje, 0);

  const paretoData = rows.slice(0, 50).map((r, i) => ({
    name: `#${i + 1}`,
    valor: r.ValorTotal,
    acum: Number(r.PorcentajeAcum.toFixed(2)),
  }));

  const pieData = [
    { name: "A", value: cntA, color: "var(--pareto-a)" },
    { name: "B", value: cntB, color: "var(--pareto-b)" },
    { name: "C", value: cntC, color: "var(--pareto-c)" },
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1.5">Resumen del inventario consolidado</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Valor total valorizado" value={formatARS(totalGeneral)} accent="primary" />
        <Stat label="Total artículos" value={rows.length.toLocaleString("es-AR")} />
        <Stat label="Divergencias" value={divergencias.length.toLocaleString("es-AR")} accent="destructive" />
        <Stat label="Concentración Cat. A" value={`${concentracionA.toFixed(1)}%`} accent="primary" />
        <Stat label="Categoría A" value={cntA} sub="Control semanal" accent="pareto-a" />
        <Stat label="Categoría B" value={cntB} sub="Control quincenal" accent="pareto-b" />
        <Stat label="Categoría C" value={cntC} sub="Mensual / Trimestral" accent="pareto-c" />
        <Stat label="No valorizables" value={cntNV} sub="Sin importe o stock" accent="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold mb-1">Curva de Pareto · primeros 50 artículos</h3>
          <p className="text-xs text-muted-foreground mb-4">Valor individual (barras) vs % acumulado (línea)</p>
          <div className="h-[320px]">
            <ResponsiveContainer>
              <ComposedChart data={paretoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, n: any) => n === "valor" ? formatARS(Number(v)) : `${v}%`}
                />
                <Bar yAxisId="left" dataKey="valor" fill="var(--pareto-a)" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="acum" stroke="var(--destructive)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1">Distribución Pareto</h3>
          <p className="text-xs text-muted-foreground mb-4">Cantidad de artículos por categoría</p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Frecuencia de control sugerida</h3>
          <p className="text-xs text-muted-foreground mb-4">Cantidad de artículos por frecuencia</p>
          <div className="h-[260px]">
            <ResponsiveContainer>
              <BarChart data={freqData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="cantidad" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1">Top 20 artículos por valor</h3>
          <p className="text-xs text-muted-foreground mb-4">Ordenados por impacto económico</p>
          <div className="overflow-y-auto max-h-[260px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">#</th><th>NME</th><th className="text-right">Valor</th><th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {top20.map((r, i) => (
                  <tr key={r.NME} className="border-b last:border-0">
                    <td className="py-1.5 text-muted-foreground">{i + 1}</td>
                    <td className="font-mono">{r.NME}</td>
                    <td className="text-right font-medium">{formatARS(r.ValorTotal)}</td>
                    <td className="text-right text-muted-foreground">{r.Porcentaje.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: any; sub?: string; accent?: string }) {
  const colorMap: Record<string, string> = {
    primary: "text-primary",
    destructive: "text-destructive",
    warning: "text-warning",
    "pareto-a": "text-pareto-a",
    "pareto-b": "text-pareto-b",
    "pareto-c": "text-pareto-c",
  };
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
      <div className={`mt-2 text-2xl font-bold tracking-tight ${accent ? colorMap[accent] : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

function Empty() {
  return (
    <div className="text-center py-24">
      <h2 className="text-xl font-semibold">Sin datos consolidados</h2>
      <p className="text-muted-foreground mt-2">Cargá los archivos y procesá la consolidación.</p>
      <Link to="/" className="inline-flex mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Ir a cargar archivos</Link>
    </div>
  );
}
