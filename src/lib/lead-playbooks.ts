/**
 * Contenido de partida de las automatizaciones de leads: un correo de
 * bienvenida y dos seguimientos por público.
 *
 * Los leads de Meta Ads son familias de Estados Unidos interesadas en el
 * programa de Eture en España (study abroad + reclutamiento para la NCAA), así
 * que los correos van en inglés y con la voz de Tommy Thompson, director de
 * Talent ID, partiendo del correo que ya envía a mano.
 *
 * Están escritos como un correo de persona a persona y no como una newsletter:
 * texto, enlaces en línea y firma, sin botones ni cabeceras. Es lo que Tommy
 * manda hoy, se lee como una respuesta suya y entra mejor en la bandeja de
 * entrada principal que una pieza maquetada.
 *
 * Padres y jugadores reciben correos distintos. A la familia se le habla de la
 * llamada con los padres; al jugador, de lo que le piden los entrenadores.
 *
 * Todos los correos saludan igual que Tommy: «Hola Jennifer,» y, cuando no hay
 * un nombre claro, «Hola family,» (`{{firstName | family}}`). El nombre viene
 * del perfil de Facebook o Instagram y a menudo no sirve para saludar («Soccer
 * Mom», «J. Smith»…); ver `greetingName` en lib/leads.ts.
 *
 * Es un fichero sin dependencias a propósito: lo usan tanto la aplicación
 * como `prisma/seed.ts`.
 */

import type { LeadAudience } from "./constants";

/** Catálogo completo del programa. */
export const LEAD_CATALOG_URL = "https://recruit.eturesports.com/";
/** Reserva de llamada con el equipo. */
export const LEAD_BOOKING_URL = "https://www.eturesports.com/book-a-call";

const BASE = "font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111827;max-width:600px;";
const P = "margin:0 0 16px;";
const A = "color:#0369a1;";

function link(url: string, label = url): string {
  return `<a href="${url}" style="${A}">${label}</a>`;
}

const SIGNATURE = `<p style="${P}">Best,<br />Tommy Thompson<br />Director of Talent ID · ETURE</p>
<p style="${P}">${link(LEAD_BOOKING_URL)}</p>`;

function wrap(paragraphs: string[], signature = SIGNATURE): string {
  const body = paragraphs.map((text) => `<p style="${P}">${text}</p>`).join("\n");
  return `<div style="${BASE}">\n${body}\n${signature}\n</div>`;
}

export type PlaybookStep = {
  delayHours: number;
  condition: "ALWAYS" | "NO_OPEN" | "NO_CLICK";
  /** Vacío = responde en el mismo hilo con «Re:». */
  subject: string;
  html: string;
};

export type Playbook = {
  audience: LeadAudience;
  /** Nombre de la automatización y del origen que se crean con él. */
  campaignName: string;
  sourceName: string;
  slug: string;
  listName: string;
  listColor: string;
  templateName: string;
  subject: string;
  previewText: string;
  html: string;
  steps: PlaybookStep[];
};

// --- Padres ------------------------------------------------------------------

const PARENT: Playbook = {
  audience: "PARENT",
  campaignName: "Leads Meta · Bienvenida padres",
  sourceName: "Padres",
  slug: "padres",
  listName: "Leads Meta · Padres",
  listColor: "#34d399",
  templateName: "Bienvenida lead · Padres",
  subject: "Quick hello from Tommy at ETURE",
  previewText: "Our soccer-specific study abroad program in Spain",
  html: wrap([
    `Hola {{firstName | family}},`,
    `I’m Tommy Thompson. I played in MLS for 11 years and I am now a director here at ETURE. We appreciate your interest in our program. ${link(LEAD_CATALOG_URL, "Here is our full program catalog")}.`,
    `We run a soccer-specific study abroad program in Spain to help players get recruited to D1, D2 and D3 in the NCAA (700+ players placed over the last decade).`,
    `Do you and your family have time to set up a call? We’d love to share more about what we’ve built. ${link(LEAD_BOOKING_URL, "You can grab a time here")}.`,
    `Vamos Toros!`,
  ]),
  steps: [
    {
      delayHours: 48,
      condition: "NO_CLICK",
      subject: "",
      html: wrap([
        `Hola {{firstName | family}},`,
        `Just bringing this back to the top of your inbox. On a first call we usually cover what a season in Spain looks like day to day, how college coaches get to see our players, and what the next steps would be for your player.`,
        `If that sounds useful, ${link(LEAD_BOOKING_URL, "pick whatever time works for you")}.`,
        `Vamos Toros!`,
      ]),
    },
    {
      delayHours: 120,
      condition: "NO_CLICK",
      subject: "",
      html: wrap([
        `Hola {{firstName | family}},`,
        `I don’t want to crowd your inbox, so this is my last note for now.`,
        `If it’s easier than a call, just reply with your player’s <strong>graduation year, position and current club</strong>, and I’ll get back to you personally on whether we think the program is a good fit.`,
      ]),
    },
  ],
};

// --- Jugadores ---------------------------------------------------------------

const PLAYER: Playbook = {
  audience: "PLAYER",
  campaignName: "Leads Meta · Bienvenida jugadores",
  sourceName: "Hijos (jugadores)",
  slug: "hijos",
  listName: "Leads Meta · Jugadores",
  listColor: "#fbbf24",
  templateName: "Bienvenida lead · Jugadores",
  subject: "{{firstName | Hey}}, quick hello from Tommy at ETURE",
  previewText: "From Spain to college soccer in the NCAA",
  html: wrap([
    `Hola {{firstName | family}},`,
    `I’m Tommy Thompson. I played in MLS for 11 years and I am now a director here at ETURE. Thanks for reaching out!`,
    `We run a soccer-specific study abroad program in Spain to help players like you get recruited to D1, D2 and D3 in the NCAA (700+ players placed over the last decade). ${link(LEAD_CATALOG_URL, "Here is the full program catalog")}.`,
    `The best next step is a quick call with you and your parents, so we can hear about your game and your goals. ${link(LEAD_BOOKING_URL, "You can book one here")}.`,
    `Vamos Toros!`,
  ]),
  steps: [
    {
      delayHours: 48,
      condition: "NO_CLICK",
      subject: "",
      html: wrap([
        `Hola {{firstName | family}},`,
        `One tip from the recruiting side: college coaches usually watch the highlight video before anything else, and they decide fast. Put your best clips in the first 30 seconds and make it easy to spot which player you are.`,
        `If you already have a highlight video, reply with the link and I’ll take a look. If you don’t, no problem, that’s something we help with.`,
        `Vamos Toros!`,
      ]),
    },
    {
      delayHours: 120,
      condition: "NO_CLICK",
      subject: "",
      html: wrap([
        `Hola {{firstName | family}},`,
        `Last note from me for now. Reply with your <strong>graduation year, position and current club</strong>, and I’ll let you know honestly what options we see for you.`,
        `And if your parents want to talk it through, ${link(LEAD_BOOKING_URL, "they can book a call here")}.`,
      ]),
    },
  ],
};

export const LEAD_PLAYBOOKS: Record<"PARENT" | "PLAYER", Playbook> = { PARENT, PLAYER };

export function playbookFor(audience: string): Playbook | null {
  return audience === "PARENT" ? PARENT : audience === "PLAYER" ? PLAYER : null;
}
