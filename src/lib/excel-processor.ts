import * as XLSX from "xlsx";

export type ArancelRow = {
  NME: string;
  Descripcion: string;
  UMD: string;
  Importe: number | null;
  Fecha: string;
};

export type InventarioRow = {
  NME: string;
  Descripcion: string;
  Talle: string;
  Nuevo: number;
  Usado: number;
  Rezago: number;
  BActa: number;
  Total: number | null;
};

export type ConsolidadoRow = {
  NME: string;
  DescripcionInv: string;
  DescripcionAra: string;
  UMD: string;
  Talle: string;
  Nuevo: number;
  Usado: number;
  Rezago: number;
  BActa: number;
  Total: number | null;
  Importe: number | null;
  Fecha: string;
  ValorTotal: number;
  Porcentaje: number;
  PorcentajeAcum: number;
  Categoria: "A" | "B" | "C" | "N/V";
  Frecuencia: "Semanal" | "Quincenal" | "Mensual" | "Trimestral" | "—";
  EstadoCruce: "OK" | "Sin arancel" | "Sin inventario" | "No valorizable";
  Observaciones: string;
};

export type Divergencia = {
  tipo: string;
  NME: string;
  descInv: string;
  descAra: string;
  total: number | null;
  importe: number | null;
  observacion: string;
};

// --- Normalizers ---
export function normNME(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\u00A0/g, " ").trim().toUpperCase();
}

export function normText(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

export function parseNumberAR(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace(/[$\s\u00A0]/g, "").replace(/ARS/gi, "").replace(/[^0-9.,\-]/g, "");
  // Argentine format: "3.272.102,60" -> 3272102.60
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  // else only dots: could be thousands. Heuristic: if more than one dot, treat as thousands
  else if (hasDot && (s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function formatARS(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

// --- Header detection ---
// Normaliza encabezados: minúsculas, sin acentos, sin puntos/espacios/guiones, sin caracteres invisibles
function normHeader(s: any): string {
  return String(s ?? "")
    .replace(/\u00A0/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s._\-/\\()]/g, "")
    .trim();
}

function findHeaderRow(rows: any[][], required: string[]): number {
  const req = required.map(normHeader);
  let bestRow = 0;
  let bestScore = 0;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const row = rows[i] || [];
    const cells = row.map(normHeader);
    const score = req.filter((r) => cells.some((c) => c === r || c.includes(r) || r.includes(c))).length;
    if (score > bestScore) { bestScore = score; bestRow = i; }
    if (score >= req.length) return i;
  }
  return bestRow;
}

function colIndex(headers: string[], names: string[]): number {
  const norm = headers.map(normHeader);
  // exact
  for (const n of names) {
    const nl = normHeader(n);
    const idx = norm.findIndex((h) => h === nl);
    if (idx >= 0) return idx;
  }
  // contains
  for (const n of names) {
    const nl = normHeader(n);
    if (!nl) continue;
    const idx = norm.findIndex((h) => h.includes(nl) || nl.includes(h));
    if (idx >= 0 && norm[idx]) return idx;
  }
  return -1;
}

export function readWorkbook(file: ArrayBuffer): any[][] {
  const wb = XLSX.read(file, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" }) as any[][];
}

const NME_VARIANTS = ["NME", "N M E", "N.M.E", "NroNME", "NumeroNME", "CodigoNME", "Codigo", "Código", "Nro", "Nro.", "N°", "Numero", "Número", "Item", "Ítem", "ID", "Articulo", "Artículo", "SKU", "Material"];

export function parseAranceles(rows: any[][]): { data: ArancelRow[]; headers: string[] } {
  const headerIdx = findHeaderRow(rows, ["NME", "Importe", "Descripcion"]);
  const headers = (rows[headerIdx] || []).map((h) => String(h));
  const iNME = colIndex(headers, NME_VARIANTS);
  const iDesc = colIndex(headers, ["Descripcion", "Descripción", "Detalle", "Articulo", "Artículo", "Producto"]);
  const iUMD = colIndex(headers, ["UMD", "Unidad", "U.M.", "UM", "UnidadMedida"]);
  const iImp = colIndex(headers, ["Importe", "Precio", "Valor", "Costo", "PrecioUnitario", "ImporteUnitario"]);
  const iFecha = colIndex(headers, ["Fecha", "FechaArancel", "Vigencia"]);
  if (iNME < 0) return { data: [], headers };
  const out: ArancelRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const nme = normNME(r[iNME]);
    if (!nme) continue;
    out.push({
      NME: nme,
      Descripcion: normText(iDesc >= 0 ? r[iDesc] : ""),
      UMD: normText(iUMD >= 0 ? r[iUMD] : ""),
      Importe: iImp >= 0 ? parseNumberAR(r[iImp]) : null,
      Fecha: formatFecha(iFecha >= 0 ? r[iFecha] : ""),
    });
  }
  return { data: out, headers };
}

function formatFecha(v: any): string {
  if (!v) return "";
  if (v instanceof Date) return v.toLocaleDateString("es-AR");
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}`;
  }
  return normText(v);
}

export function parseInventario(rows: any[][]): InventarioRow[] {
  const headerIdx = findHeaderRow(rows, ["NME", "Total", "Descripcion"]);
  const headers = (rows[headerIdx] || []).map((h) => String(h));
  const iNME = colIndex(headers, ["NME"]);
  const iDesc = colIndex(headers, ["Descripcion", "Descripción", "Detalle"]);
  const iTalle = colIndex(headers, ["Talle", "Talla"]);
  const iNuevo = colIndex(headers, ["Nuevo"]);
  const iUsado = colIndex(headers, ["Usado"]);
  const iRezago = colIndex(headers, ["Rezago"]);
  const iBA = colIndex(headers, ["B/Acta", "BActa", "B Acta", "Acta"]);
  const iTotal = colIndex(headers, ["Total", "Cantidad"]);
  const out: InventarioRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const nme = normNME(iNME >= 0 ? r[iNME] : "");
    if (!nme) continue;
    out.push({
      NME: nme,
      Descripcion: normText(iDesc >= 0 ? r[iDesc] : ""),
      Talle: normText(iTalle >= 0 ? r[iTalle] : ""),
      Nuevo: parseNumberAR(iNuevo >= 0 ? r[iNuevo] : 0) ?? 0,
      Usado: parseNumberAR(iUsado >= 0 ? r[iUsado] : 0) ?? 0,
      Rezago: parseNumberAR(iRezago >= 0 ? r[iRezago] : 0) ?? 0,
      BActa: parseNumberAR(iBA >= 0 ? r[iBA] : 0) ?? 0,
      Total: iTotal >= 0 ? parseNumberAR(r[iTotal]) : null,
    });
  }
  return out;
}

// --- Similarity ---
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  if (A === B) return 1;
  const setA = new Set(A.split(/\s+/));
  const setB = new Set(B.split(/\s+/));
  const inter = [...setA].filter((x) => setB.has(x)).length;
  return inter / Math.max(setA.size, setB.size);
}

export type ConsolidadoResult = {
  rows: ConsolidadoRow[];
  divergencias: Divergencia[];
  totalGeneral: number;
};

export function consolidate(
  aranceles: ArancelRow[],
  inventario: InventarioRow[],
): ConsolidadoResult {
  const divergencias: Divergencia[] = [];

  // Detect duplicates
  const dupAra = new Map<string, number>();
  aranceles.forEach((a) => dupAra.set(a.NME, (dupAra.get(a.NME) || 0) + 1));
  const dupInv = new Map<string, number>();
  inventario.forEach((i) => dupInv.set(i.NME, (dupInv.get(i.NME) || 0) + 1));
  dupAra.forEach((c, nme) => {
    if (c > 1)
      divergencias.push({
        tipo: "Duplicado en aranceles",
        NME: nme,
        descInv: "",
        descAra: aranceles.find((a) => a.NME === nme)?.Descripcion || "",
        total: null,
        importe: null,
        observacion: `Aparece ${c} veces en aranceles`,
      });
  });
  dupInv.forEach((c, nme) => {
    if (c > 1)
      divergencias.push({
        tipo: "Duplicado en inventario",
        NME: nme,
        descInv: inventario.find((i) => i.NME === nme)?.Descripcion || "",
        descAra: "",
        total: null,
        importe: null,
        observacion: `Aparece ${c} veces en inventario`,
      });
  });

  // Build maps (use first occurrence)
  const araMap = new Map<string, ArancelRow>();
  aranceles.forEach((a) => { if (!araMap.has(a.NME)) araMap.set(a.NME, a); });
  const invMap = new Map<string, InventarioRow>();
  inventario.forEach((i) => { if (!invMap.has(i.NME)) invMap.set(i.NME, i); });

  const rows: ConsolidadoRow[] = [];
  const allNMEs = new Set([...araMap.keys(), ...invMap.keys()]);

  allNMEs.forEach((nme) => {
    const a = araMap.get(nme);
    const inv = invMap.get(nme);
    const obs: string[] = [];
    let estado: ConsolidadoRow["EstadoCruce"] = "OK";

    if (!a && inv) {
      estado = "Sin arancel";
      divergencias.push({
        tipo: "Falta en aranceles",
        NME: nme,
        descInv: inv.Descripcion,
        descAra: "",
        total: inv.Total,
        importe: null,
        observacion: "Cargar arancel para valorizar",
      });
    } else if (a && !inv) {
      estado = "Sin inventario";
      divergencias.push({
        tipo: "Falta en inventario",
        NME: nme,
        descInv: "",
        descAra: a.Descripcion,
        total: null,
        importe: a.Importe,
        observacion: "No hay stock cargado",
      });
    }

    const importe = a?.Importe ?? null;
    const total = inv?.Total ?? null;

    if (a && inv) {
      const sim = similarity(a.Descripcion, inv.Descripcion);
      if (sim < 0.4 && a.Descripcion && inv.Descripcion) {
        obs.push("Descripciones divergentes");
        divergencias.push({
          tipo: "Descripción divergente",
          NME: nme,
          descInv: inv.Descripcion,
          descAra: a.Descripcion,
          total,
          importe,
          observacion: "Verificar que sea el mismo artículo",
        });
      }
    }

    if (importe === null || importe === 0) {
      obs.push("Importe inválido");
      if (a)
        divergencias.push({
          tipo: "Importe inválido",
          NME: nme,
          descInv: inv?.Descripcion || "",
          descAra: a.Descripcion,
          total,
          importe,
          observacion: "Importe vacío o cero",
        });
    }
    if (total === null || total === 0) {
      obs.push("Total inválido");
      if (inv)
        divergencias.push({
          tipo: "Total inválido",
          NME: nme,
          descInv: inv.Descripcion,
          descAra: a?.Descripcion || "",
          total,
          importe,
          observacion: "Cantidad vacía o cero",
        });
    }

    const valorizable =
      importe !== null && importe > 0 && total !== null && total > 0;
    const valor = valorizable ? (importe as number) * (total as number) : 0;
    if (!valorizable && estado === "OK") estado = "No valorizable";

    rows.push({
      NME: nme,
      DescripcionInv: inv?.Descripcion || "",
      DescripcionAra: a?.Descripcion || "",
      UMD: a?.UMD || "",
      Talle: inv?.Talle || "",
      Nuevo: inv?.Nuevo ?? 0,
      Usado: inv?.Usado ?? 0,
      Rezago: inv?.Rezago ?? 0,
      BActa: inv?.BActa ?? 0,
      Total: total,
      Importe: importe,
      Fecha: a?.Fecha || "",
      ValorTotal: valor,
      Porcentaje: 0,
      PorcentajeAcum: 0,
      Categoria: "N/V",
      Frecuencia: "—",
      EstadoCruce: estado,
      Observaciones: obs.join("; "),
    });
  });

  // Sort and Pareto
  rows.sort((a, b) => b.ValorTotal - a.ValorTotal);
  const totalGeneral = rows.reduce((s, r) => s + r.ValorTotal, 0);
  let acum = 0;
  for (const r of rows) {
    if (r.ValorTotal > 0 && totalGeneral > 0) {
      r.Porcentaje = (r.ValorTotal / totalGeneral) * 100;
      acum += r.Porcentaje;
      r.PorcentajeAcum = acum;
      if (acum <= 70) {
        r.Categoria = "A";
        r.Frecuencia = "Semanal";
      } else if (acum <= 90) {
        r.Categoria = "B";
        r.Frecuencia = "Quincenal";
      } else if (acum <= 97) {
        r.Categoria = "C";
        r.Frecuencia = "Mensual";
      } else {
        r.Categoria = "C";
        r.Frecuencia = "Trimestral";
      }
    } else {
      r.Categoria = "N/V";
      r.Frecuencia = "—";
    }
  }

  return { rows, divergencias, totalGeneral };
}

// --- Export ---
export function exportToExcel(rows: any[], filename: string, sheetName = "Datos") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function consolidadoToExportRows(rows: ConsolidadoRow[]) {
  return rows.map((r) => ({
    NME: r.NME,
    "Descripción (inventario)": r.DescripcionInv,
    "Descripción (arancel)": r.DescripcionAra,
    UMD: r.UMD,
    Talle: r.Talle,
    Nuevo: r.Nuevo,
    Usado: r.Usado,
    Rezago: r.Rezago,
    "B/Acta": r.BActa,
    Total: r.Total,
    "Importe unitario": r.Importe,
    "Fecha arancel": r.Fecha,
    "Valor Total": r.ValorTotal,
    "% sobre total": Number(r.Porcentaje.toFixed(4)),
    "% acumulado": Number(r.PorcentajeAcum.toFixed(4)),
    Categoría: r.Categoria,
    "Frecuencia control": r.Frecuencia,
    "Estado cruce": r.EstadoCruce,
    Observaciones: r.Observaciones,
  }));
}
