import { type NextRequest } from "next/server";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { MAX_FILE_BYTES, guessMapping, parseSpreadsheet } from "@/lib/import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Primer paso de la importación: analiza el fichero y devuelve una muestra con
 * el mapeo de columnas propuesto, sin escribir todavía en base de datos.
 */
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    await requireApiUser();

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) throw new ApiError(400, "No se ha recibido ningún fichero.");
    if (file.size === 0) throw new ApiError(400, "El fichero está vacío.");
    if (file.size > MAX_FILE_BYTES) {
      throw new ApiError(400, `El fichero supera el límite de ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let sheet;
    try {
      sheet = parseSpreadsheet(buffer, file.name, file.type);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : "No se ha podido leer el fichero.");
    }

    if (sheet.headers.length === 0 || sheet.rows.length === 0) {
      throw new ApiError(400, "El fichero no contiene filas de datos. Comprueba que la primera fila sean cabeceras.");
    }

    return {
      filename: file.name,
      headers: sheet.headers,
      mapping: guessMapping(sheet.headers),
      totalRows: sheet.totalRows,
      truncated: sheet.truncated,
      preview: sheet.rows.slice(0, 8),
      // Las filas viajan de vuelta al cliente y regresan en el paso de
      // confirmación. Evita mantener estado de subida en el servidor a costa
      // de una petición algo más pesada, algo asumible con el límite de 50.000
      // filas y 20 MB que ya se aplica arriba.
      rows: sheet.rows,
    };
  });
}
