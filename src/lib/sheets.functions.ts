type Row = Record<string, string | number | null | undefined>;
type SheetPayload = { name: string; rows: Row[] };

export async function exportToGoogleSheet(data: {
  title: string;
  sheets: SheetPayload[];
}): Promise<{ url: string; spreadsheetId: string }> {
  const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined;
  if (!scriptUrl) {
    throw new Error(
      "Falta la variable VITE_APPS_SCRIPT_URL. Seguí las instrucciones de SETUP-GOOGLE.md.",
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

  const json = (await res.json()) as {
    url?: string;
    spreadsheetId?: string;
    error?: string;
  };
  if (json.error) throw new Error(`Error en Apps Script: ${json.error}`);
  if (!json.url) throw new Error("El script no devolvió la URL del Sheet.");

  return { url: json.url, spreadsheetId: json.spreadsheetId ?? "" };
}
