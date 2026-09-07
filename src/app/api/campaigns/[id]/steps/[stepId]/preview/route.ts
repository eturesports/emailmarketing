import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { buildMergeContext, renderTemplate } from "@/lib/merge";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; stepId: string }> };

/**
 * Previsualiza un seguimiento tal y como lo recibirá un destinatario real.
 *
 * Devuelve HTML directamente (no JSON) para poder abrirlo en una pestaña. Va en
 * un documento aislado con las etiquetas ya resueltas, de modo que se vea lo
 * mismo que llegará al buzón.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No has iniciado sesión." }, { status: 401 });

  const { id, stepId } = await params;

  const [campaign, step] = await Promise.all([
    prisma.campaign.findUnique({ where: { id } }),
    prisma.sequenceStep.findFirst({ where: { id: stepId, campaignId: id } }),
  ]);

  if (!campaign || !step) {
    return NextResponse.json({ error: "El seguimiento no existe." }, { status: 404 });
  }

  // Se usa un destinatario real de la campaña para que las etiquetas se vean
  // con datos de verdad y no con marcadores.
  const sample = await prisma.recipient.findFirst({
    where: { campaignId: id, stepKey: "initial" },
    include: { contact: true },
    orderBy: { id: "asc" },
  });

  const context = sample
    ? buildMergeContext(sample.contact)
    : { firstname: "Nombre", lastname: "Apellido", email: "ejemplo@eturesports.com", fullname: "Nombre Apellido" };

  const subject = renderTemplate(step.subject.trim() || `Re: ${campaign.subject}`, context);
  const html = renderTemplate(step.html, context, { escape: true });

  const page = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title>
<style>
  body { margin:0; background:#f3f4f6; font-family:Arial,Helvetica,sans-serif; }
  .barra { background:#fff; border-bottom:1px solid #e5e7eb; padding:14px 20px; }
  .etiqueta { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:#6b7280; }
  .asunto { font-size:16px; font-weight:600; color:#111827; margin-top:2px; }
  .aviso { font-size:12px; color:#6b7280; margin-top:6px; }
  .cuerpo { background:#fff; margin:20px auto; max-width:680px; padding:24px; border:1px solid #e5e7eb; border-radius:8px; }
</style></head>
<body>
  <div class="barra">
    <div class="etiqueta">Vista previa del seguimiento ${step.position + 1}</div>
    <div class="asunto">${escapeHtml(subject)}</div>
    <div class="aviso">${sample ? `Con los datos de ${escapeHtml(sample.contact.email)}` : "Con datos de ejemplo: la campaña aún no tiene destinatarios"}</div>
  </div>
  <div class="cuerpo">${html}</div>
</body></html>`;

  return new NextResponse(page, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
