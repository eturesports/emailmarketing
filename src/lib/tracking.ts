import crypto from "node:crypto";
import { absoluteUrl, env } from "./env";

/**
 * Seguimiento de aperturas y clics, e inyección del pie de baja.
 *
 * Todo se hace reescribiendo el HTML justo antes de enviar cada correo, de modo
 * que el enlace lleva el `trackingId` de ese destinatario concreto.
 *
 * Las URL se construyen sobre una **base configurable** (`base`), no sobre
 * APP_URL: con un dominio de seguimiento propio, los enlaces del correo salen
 * de un subdominio del dominio de envío en lugar del dominio de la aplicación.
 * Los filtros antispam comparan ambos, y que no concuerden penaliza la entrega.
 * Ver `getTrackingBaseUrl` en lib/settings.ts.
 *
 * La base no entra en la firma HMAC de los enlaces, así que cambiar de dominio
 * no invalida los enlaces de correos ya enviados.
 */

/** Une base y ruta sin depender de APP_URL. */
function join(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** GIF transparente de 1x1 usado como píxel de apertura. */
export const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

/**
 * Los enlaces rastreados van firmados. Sin firma, /api/track/c sería un
 * redirector abierto que cualquiera podría usar para camuflar phishing detrás
 * de nuestro dominio.
 */
function signUrl(trackingId: string, url: string): string {
  return crypto
    .createHmac("sha256", env.sessionSecret)
    .update(`${trackingId}:${url}`)
    .digest("base64url")
    .slice(0, 32);
}

export function verifyUrlSignature(trackingId: string, url: string, signature: string): boolean {
  const expected = signUrl(trackingId, url);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function openPixelUrl(trackingId: string, base = env.appUrl): string {
  return join(base, `/api/track/o/${trackingId}.gif`);
}

export function clickUrl(trackingId: string, target: string, base = env.appUrl): string {
  const encoded = Buffer.from(target, "utf8").toString("base64url");
  return join(base, `/api/track/c/${trackingId}?u=${encoded}&s=${signUrl(trackingId, target)}`);
}

export function decodeClickTarget(encoded: string): string | null {
  try {
    const url = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = new URL(url);
    // Sólo http(s): evita javascript:, data: y demás esquemas peligrosos.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function unsubscribeUrl(token: string, campaignId?: string, base = env.appUrl): string {
  const suffix = campaignId ? `?c=${encodeURIComponent(campaignId)}` : "";
  return join(base, `/baja/${token}${suffix}`);
}

/** Enlace de baja en un clic para la cabecera List-Unsubscribe (RFC 8058). */
export function oneClickUnsubscribeUrl(token: string, campaignId?: string, base = env.appUrl): string {
  const suffix = campaignId ? `?c=${encodeURIComponent(campaignId)}` : "";
  return join(base, `/api/unsubscribe/${token}${suffix}`);
}

/**
 * Reescribe los `href` del HTML para que pasen por el redirector de clics.
 *
 * Se dejan intactos: anclas, mailto:, tel:, el propio enlace de baja y
 * cualquier enlace que todavía contenga una etiqueta de combinación sin
 * resolver (no tendría sentido firmar una URL con `{{...}}` dentro).
 */
export function rewriteLinks(html: string, trackingId: string, base = env.appUrl): string {
  return html.replace(/(<a\b[^>]*?\bhref\s*=\s*)(["'])(.*?)\2/gi, (match, prefix: string, quote: string, url: string) => {
    const trimmed = url.trim();

    if (!/^https?:\/\//i.test(trimmed)) return match;
    if (trimmed.includes("{{") || trimmed.includes("}}")) return match;

    // Ni el pie de baja ni nuestros propios endpoints se rastrean, vengan por
    // el dominio de seguimiento o por el de la aplicación.
    const ownPrefixes = [join(base, "/baja/"), join(base, "/api/"), absoluteUrl("/baja/"), absoluteUrl("/api/")];
    if (ownPrefixes.some((prefix) => trimmed.startsWith(prefix))) return match;

    // El HTML ya viene con entidades; hay que decodificar antes de firmar y
    // volver a codificar al insertar, o la firma no cuadraría en el redirector.
    const decoded = decodeEntities(trimmed);
    return `${prefix}${quote}${escapeAttribute(clickUrl(trackingId, decoded, base))}${quote}`;
  });
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Añade el píxel de apertura justo antes de </body> (o al final del HTML). */
export function injectOpenPixel(html: string, trackingId: string, base = env.appUrl): string {
  const pixel = `<img src="${escapeAttribute(openPixelUrl(trackingId, base))}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;outline:none;" />`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${pixel}</body>`);
  }
  return `${html}${pixel}`;
}

export type UnsubscribeFooterOptions = {
  token: string;
  campaignId: string;
  senderName: string;
  base?: string;
};

/** Pie de baja obligatorio (art. 21 LSSI / RGPD) que se añade al final. */
export function buildUnsubscribeFooter({
  token,
  campaignId,
  senderName,
  base = env.appUrl,
}: UnsubscribeFooterOptions): string {
  const url = escapeAttribute(unsubscribeUrl(token, campaignId, base));

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e5e7eb;">
  <tr>
    <td style="padding:16px 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">
      Recibes este correo porque estás suscrito a las comunicaciones de ${escapeHtmlText(senderName)}.<br />
      <a href="${url}" style="color:#6b7280;text-decoration:underline;">Darse de baja</a>
    </td>
  </tr>
</table>`.trim();
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type PrepareHtmlOptions = {
  html: string;
  trackingId: string;
  campaignId: string;
  unsubscribeToken: string;
  senderName: string;
  trackOpens: boolean;
  trackClicks: boolean;
  includeUnsubscribe: boolean;
  /** Dominio propio de seguimiento; por defecto, el de la aplicación. */
  base?: string;
};

/** Aplica pie de baja, reescritura de enlaces y píxel, en ese orden. */
export function prepareHtmlForSend(options: PrepareHtmlOptions): string {
  const base = options.base ?? env.appUrl;
  let html = options.html;

  if (options.includeUnsubscribe) {
    const footer = buildUnsubscribeFooter({
      token: options.unsubscribeToken,
      campaignId: options.campaignId,
      senderName: options.senderName,
      base,
    });
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${footer}</body>`) : `${html}${footer}`;
  }

  // La reescritura va después del pie para que su enlace de baja quede fuera
  // (rewriteLinks lo excluye explícitamente) y no contamine las estadísticas.
  if (options.trackClicks) {
    html = rewriteLinks(html, options.trackingId, base);
  }

  if (options.trackOpens) {
    html = injectOpenPixel(html, options.trackingId, base);
  }

  return html;
}
