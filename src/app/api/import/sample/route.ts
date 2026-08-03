import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildSampleCsv } from "@/lib/import";

export const dynamic = "force-dynamic";

/** CSV de ejemplo con las columnas que la plataforma reconoce automáticamente. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No has iniciado sesión." }, { status: 401 });

  return new NextResponse(`﻿${buildSampleCsv()}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ejemplo-contactos-eture.csv"',
      "Cache-Control": "no-store",
    },
  });
}
