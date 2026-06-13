import { createServerFn } from "@tanstack/react-start";

type Row = Record<string, string | number | null | undefined>;
type SheetPayload = { name: string; rows: Row[] };

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

function safeName(n: string) {
  // Google Sheets tab names: max 100 chars, no : \ / ? * [ ]
  return n.replace(/[:\\/?*\[\]]/g, " ").slice(0, 90) || "Hoja";
}

export const exportToGoogleSheet = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { title: string; sheets: SheetPayload[] }) => {
      if (!d?.title || !Array.isArray(d.sheets) || d.sheets.length === 0) {
        throw new Error("Datos inválidos");
      }
      return d;
    },
  )
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const connKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!lovableKey || !connKey) {
      throw new Error(
        "La conexión con Google Sheets no está configurada en el servidor.",
      );
    }

    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connKey,
      "Content-Type": "application/json",
    };

    const sheetTitles = data.sheets.map((s) => safeName(s.name));

    // 1) Create the spreadsheet with one tab per dataset
    const createRes = await fetch(`${GATEWAY}/spreadsheets`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        properties: { title: data.title },
        sheets: sheetTitles.map((t) => ({ properties: { title: t } })),
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`No se pudo crear el Sheet (${createRes.status}): ${body}`);
    }
    const created = (await createRes.json()) as {
      spreadsheetId: string;
      spreadsheetUrl: string;
    };

    // 2) Write values to each tab
    const valueData = data.sheets.map((s, i) => {
      const cols = s.rows.length ? Object.keys(s.rows[0]) : [];
      const values: (string | number)[][] = [cols];
      for (const r of s.rows) {
        values.push(
          cols.map((c) => {
            const v = r[c];
            if (v === null || v === undefined) return "";
            return v as string | number;
          }),
        );
      }
      return {
        range: `'${sheetTitles[i]}'!A1`,
        majorDimension: "ROWS",
        values,
      };
    });

    const updateRes = await fetch(
      `${GATEWAY}/spreadsheets/${created.spreadsheetId}/values:batchUpdate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          valueInputOption: "RAW",
          data: valueData,
        }),
      },
    );
    if (!updateRes.ok) {
      const body = await updateRes.text();
      throw new Error(
        `No se pudieron cargar los datos (${updateRes.status}): ${body}`,
      );
    }

    return { url: created.spreadsheetUrl, spreadsheetId: created.spreadsheetId };
  });
