# Configuración de Google Sheets (via Apps Script)

No requiere Google Cloud ni credenciales. Solo necesitás una cuenta de Google.

---

## Paso 1 — Crear la Google Sheet

1. Ir a https://sheets.google.com
2. Crear una hoja en blanco (puede llamarse "Consolidado Inventario" o como quieras)
3. Esta hoja va a recibir los datos cada vez que exportes desde la app

---

## Paso 2 — Abrir Apps Script

1. Dentro de la hoja, ir al menú **Extensiones → Apps Script**
2. Se abre el editor de scripts en una nueva pestaña

---

## Paso 3 — Pegar el script

Borrá el código que hay (la función `myFunction` vacía) y pegá esto:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    for (const sheetData of data.sheets) {
      let sheet = ss.getSheetByName(sheetData.name);
      if (sheet) {
        sheet.clearContents();
      } else {
        sheet = ss.insertSheet(sheetData.name);
      }

      if (!sheetData.rows || sheetData.rows.length === 0) continue;

      const cols = Object.keys(sheetData.rows[0]);
      const values = [cols];
      for (const row of sheetData.rows) {
        values.push(cols.map(c => (row[c] === null || row[c] === undefined) ? "" : row[c]));
      }

      sheet.getRange(1, 1, values.length, cols.length).setValues(values);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ url: ss.getUrl(), spreadsheetId: ss.getId() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Guardar el proyecto (Ctrl+S o el ícono de disquete)

---

## Paso 4 — Desplegar como web app

1. Clic en **"Implementar"** → **"Nueva implementación"**
2. Tipo: **"Aplicación web"**
3. Configuración:
   - **Ejecutar como:** `Yo (tu cuenta de Google)`
   - **Quién tiene acceso:** `Cualquier usuario`
4. Clic en **"Implementar"**
5. La primera vez te va a pedir que autorices los permisos — aceptar todo
6. Copiar la **URL de la aplicación web** — se ve así:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## Paso 5 — Crear el archivo .env

En la raíz del proyecto, crear un archivo llamado `.env` con:

```
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
```

(Reemplazar con la URL que copiaste en el paso anterior)

---

## Paso 6 — Arrancar la app

```
npm run dev
```

Cargás los dos Excel, consolidás, y usás **"Enviar a Google Sheets"**.
Los datos se escriben automáticamente en la hoja que creaste y te aparece el link.

---

## Nota sobre re-exportaciones

Cada vez que exportás, la app **sobreescribe** las pestañas "Consolidado" y "Divergencias" en la misma hoja.
No crea hojas nuevas cada vez.
