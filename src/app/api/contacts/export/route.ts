import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { contactsToCsv } from "@/lib/import";
import { currentDay, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Descarga los contactos (con los filtros aplicados) en CSV compatible con Excel. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No has iniciado sesión." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  const status = params.get("status") ?? "";
  const listId = params.get("listId") ?? "";

  const contacts = await prisma.contact.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { email: { contains: query } },
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { company: { contains: query } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(listId ? { memberships: { some: { listId } } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const list = listId ? await prisma.contactList.findUnique({ where: { id: listId } }) : null;
  const name = `contactos-${list ? slugify(list.name) : "eture"}-${currentDay()}.csv`;

  // El BOM hace que Excel abra el fichero como UTF-8 y no rompa los acentos.
  const csv = `﻿${contactsToCsv(contacts)}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
