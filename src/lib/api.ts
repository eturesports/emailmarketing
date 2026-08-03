import { NextResponse } from "next/server";

/**
 * Utilidades de los route handlers.
 *
 * Va en su propio módulo (y no en lib/utils) porque `utils` lo importan también
 * componentes de cliente: mezclarlos arrastraría `next/server` y, por la cadena
 * de dependencias, Prisma y las credenciales al bundle del navegador.
 */

/** Error con código HTTP asociado, para responder de forma uniforme. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Envuelve el cuerpo de un route handler y traduce los errores conocidos. */
export async function handleApi<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.name === "GoogleAuthError") {
      return NextResponse.json({ error: error.message, code: "GOOGLE_AUTH" }, { status: 409 });
    }

    console.error("[api]", error);
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
