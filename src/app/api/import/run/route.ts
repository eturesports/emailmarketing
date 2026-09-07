import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, requireApiUser } from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { MAX_IMPORT_ROWS, runImport } from "@/lib/import";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const schema = z.object({
  filename: z.string().max(260),
  rows: z.array(z.record(z.string(), z.string())).max(MAX_IMPORT_ROWS),
  mapping: z.record(z.string(), z.string()),
  listIds: z.array(z.string()).default([]),
  updateExisting: z.boolean().default(true),
  resubscribe: z.boolean().default(false),
  verify: z.boolean().default(true),
});

/** Segundo paso: ejecuta la importación con el mapeo confirmado. */
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const user = await requireApiUser();

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Los datos de la importación no son válidos.");
    }

    const { rows, mapping, listIds, updateExisting, resubscribe, verify, filename } = parsed.data;
    if (rows.length === 0) throw new ApiError(400, "No hay filas que importar.");

    if (!Object.values(mapping).includes("email")) {
      throw new ApiError(400, "Tienes que indicar qué columna contiene el email.");
    }

    const result = await runImport({
      rows,
      mapping,
      listIds,
      updateExisting,
      resubscribe,
      verify,
      userId: user.id,
      filename,
    });

    return result;
  });
}
