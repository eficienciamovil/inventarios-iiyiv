import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Upload, Table2, AlertTriangle, Download, Boxes } from "lucide-react";

const nav = [
  { to: "/", label: "Inicio", icon: Upload },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/consolidado", label: "Consolidado", icon: Table2 },
  { to: "/divergencias", label: "Divergencias", icon: AlertTriangle },
  { to: "/exportar", label: "Exportar", icon: Download },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-[1400px] px-6 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-semibold text-[15px]">Consolidador</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Inventario · Pareto</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-6 py-8">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Procesamiento 100% local · Los archivos no se cargan a ningún servidor
      </footer>
    </div>
  );
}
