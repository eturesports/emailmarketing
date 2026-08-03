import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { IconGoogle } from "@/components/icons";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Iniciar sesión" };

const ERRORS: Record<string, string> = {
  denied: "Has cancelado el acceso desde Google. Vuelve a intentarlo para continuar.",
  domain:
    "Esa cuenta no pertenece a un dominio autorizado. Entra con tu cuenta corporativa de Google Workspace de Eture.",
  state: "La sesión de acceso ha caducado o el enlace no es válido. Inténtalo de nuevo.",
  scope:
    "No se concedió el permiso para enviar correo desde Gmail. Es imprescindible: acepta todas las casillas en la pantalla de Google.",
  config:
    "Faltan credenciales de Google en la configuración del servidor. Revisa GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el fichero .env.",
  unknown: "No se ha podido completar el inicio de sesión. Inténtalo de nuevo en unos segundos.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/panel");

  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? ERRORS.unknown) : null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      {/* Halo decorativo de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand opacity-[0.07] blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={44} />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Eture Mailer</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Campañas de email marketing personalizadas, enviadas desde el Gmail de Eture.
          </p>
        </div>

        <div className="card p-6">
          {message ? (
            <div className="mb-5">
              <Alert tone="danger">{message}</Alert>
            </div>
          ) : null}

          <a
            href="/api/auth/login"
            className="flex h-11 w-full items-center justify-center gap-3 rounded-lg bg-white px-4 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#f3f4f6]"
          >
            <IconGoogle size={18} />
            Continuar con Google Workspace
          </a>

          <p className="mt-5 text-xs leading-relaxed text-ink-faint">
            Se solicitará permiso para <strong className="text-ink-muted">enviar correo en tu nombre</strong>.
            La plataforma nunca lee tu bandeja de entrada: el único permiso de lectura que pide es el de tus alias de
            «enviar como», para poder mandar desde una dirección corporativa.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Acceso restringido al equipo de Eture Esports.
        </p>
      </div>
    </main>
  );
}
