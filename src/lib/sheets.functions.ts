import { createServerFn } from "@tanstack/react-start";

type Row = Record<string, string | number | null | undefined>;
type SheetPayload = { name: string; rows: Row[] };

export const exportToGoogleSheet = createServerFn({ method: "POST" })
  .validator(
    (d: { title: string; sheets: SheetPayload[] }) => {
      if (!d?.title || !Array.isArray(d.sheets) || d.sheets.length === 0) {
        throw new Error("Datos inválidos");
      }
      return d;
    },
  )
  .handler(async ({ data }) => {
    const scriptUrl = process.env.APPS_SCRIPT_URL;
    if (!scriptUrl) {
      throw new Error(
        "Falta la variable APPS_SCRIPT_URL en el servidor. Seguí las instrucciones de SETUP-GOOGLE.md.",
      );
    }

    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: data.title, sheets: data.sheets }),
      redirect: "follow",
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Error del script (${res.status}): ${body}`);
    }

    const json = (await res.json()) as { url?: string; spreadsheetId?: string; error?: string };
    if (json.error) throw new Error(`Error en Apps Script: ${json.error}`);
    if (!json.url) throw new Error("El script no devolvió la URL del Sheet.");

    return { url: json.url, spreadsheetId: json.spreadsheetId ?? "" };
  });
