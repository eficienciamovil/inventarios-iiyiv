import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useRouter, Link } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Página no encontrada</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Volver al inicio</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Reintentar</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Consolidador de Inventario · Pareto" },
      { name: "description", content: "Cruza aranceles e inventario por NME, valoriza, aplica Pareto y genera informes de divergencias." },
      { property: "og:title", content: "Consolidador de Inventario · Pareto" },
      { name: "twitter:title", content: "Consolidador de Inventario · Pareto" },
      { property: "og:description", content: "Cruza aranceles e inventario por NME, valoriza, aplica Pareto y genera informes de divergencias." },
      { name: "twitter:description", content: "Cruza aranceles e inventario por NME, valoriza, aplica Pareto y genera informes de divergencias." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3994ce01-89e9-4b0d-aef6-36c069581f8a/id-preview-e76c8546--9acc5baf-467f-4a2f-b672-1c2464c3c873.lovable.app-1778885325324.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3994ce01-89e9-4b0d-aef6-36c069581f8a/id-preview-e76c8546--9acc5baf-467f-4a2f-b672-1c2464c3c873.lovable.app-1778885325324.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head><HeadContent /></head>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <Scripts />
      </body>
    </html>
  );
}

function QueryProvider({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
