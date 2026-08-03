import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { resubscribeByToken, unsubscribeByToken } from "@/lib/unsubscribe";
import { CONTACT_STATUS } from "@/lib/constants";
import { Logo } from "@/components/logo";
import { IconCheck } from "@/components/icons";

export const metadata: Metadata = {
  title: "Cancelar suscripción",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Página pública de baja. No requiere sesión: se identifica al contacto por un
 * token opaco e imposible de adivinar que viaja en el pie de cada correo.
 */
export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { token } = await params;
  const { c: campaignId } = await searchParams;

  const contact = await prisma.contact.findUnique({
    where: { unsubscribeToken: token },
    select: { email: true, status: true },
  });

  async function unsubscribe() {
    "use server";
    await unsubscribeByToken(token, campaignId ?? null);
    revalidatePath(`/baja/${token}`);
  }

  async function resubscribe() {
    "use server";
    await resubscribeByToken(token);
    revalidatePath(`/baja/${token}`);
  }

  const isUnsubscribed = contact?.status === CONTACT_STATUS.UNSUBSCRIBED;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={40} />
        </div>

        <div className="card p-8 text-center">
          {!contact ? (
            <>
              <h1 className="text-lg font-semibold">Enlace no válido</h1>
              <p className="mt-2 text-sm text-ink-muted">
                Este enlace de baja ha caducado o no corresponde a ningún contacto. Si sigues recibiendo correos que no
                deseas, responde al último mensaje y lo resolveremos.
              </p>
            </>
          ) : isUnsubscribed ? (
            <>
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#0f3529]">
                <IconCheck size={24} className="text-success" />
              </div>
              <h1 className="text-lg font-semibold">Suscripción cancelada</h1>
              <p className="mt-2 text-sm text-ink-muted">
                <strong className="text-ink">{contact.email}</strong> ya no recibirá más comunicaciones
                comerciales de Eture Esports.
              </p>

              <form action={resubscribe} className="mt-6">
                <button
                  type="submit"
                  className="text-sm text-ink-faint underline hover:text-brand"
                >
                  Me he dado de baja por error, volver a suscribirme
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold">¿Cancelar la suscripción?</h1>
              <p className="mt-2 text-sm text-ink-muted">
                Dejarás de recibir las comunicaciones de Eture Esports en{" "}
                <strong className="text-ink">{contact.email}</strong>.
              </p>

              <form action={unsubscribe} className="mt-6">
                <button
                  type="submit"
                  className="h-11 w-full rounded-lg bg-brand text-sm font-medium text-[#04202a] transition-colors hover:bg-brand-strong"
                >
                  Confirmar baja
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">Eture Esports</p>
      </div>
    </main>
  );
}
