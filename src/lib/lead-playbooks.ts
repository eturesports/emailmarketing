/**
 * Contenido de partida de las automatizaciones de leads: un correo de
 * bienvenida y dos seguimientos por público.
 *
 * Padres y jugadores llegan con preguntas distintas. A las familias les
 * preocupa el coste, los estudios y quién acompaña a su hijo; al jugador, si
 * tiene nivel y qué tiene que hacer para que le vean. Por eso cada origen tiene
 * su propia secuencia en lugar de un correo único con el nombre cambiado.
 *
 * El saludo usa siempre un valor por defecto (`{{firstName | familia}}`): el
 * nombre de un lead viene del perfil de Facebook o Instagram y a veces no
 * existe o no es fiable (ver `cleanPersonName` en lib/leads.ts), y «Hola,
 * familia» queda mucho mejor que «Hola ,».
 *
 * Es un fichero sin dependencias a propósito: lo usan tanto la aplicación
 * como `prisma/seed.ts`.
 */

import type { LeadAudience } from "./constants";

/** Página a la que llevan los botones. Cámbiala en cada correo desde el editor. */
export const LEAD_CTA_URL = "https://eturesports.com";

const BASE = "font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;";
const P = "margin:0 0 16px;";
const MUTED = "margin:0 0 16px;color:#374151;";
const SIGN = "margin:24px 0 0;color:#6b7280;font-size:13px;";

function button(label: string): string {
  return `<p style="margin:24px 0 28px;">
    <a href="${LEAD_CTA_URL}" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">${label}</a>
  </p>`;
}

function wrap(body: string): string {
  return `<div style="${BASE}">\n${body.trim()}\n</div>`;
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
  subject: "{{firstName | Hola}}, así funciona una beca de fútbol en EE. UU.",
  previewText: "Estudiar una carrera y seguir jugando: lo que necesitáis saber",
  html: wrap(`
  <p style="${P}">Hola {{firstName | familia}},</p>
  <p style="${MUTED}">
    Gracias por tu interés en que tu hijo o hija pueda estudiar una carrera universitaria en Estados Unidos
    sin dejar el fútbol. Es una decisión importante para toda la familia, y queremos que la toméis con
    toda la información.
  </p>
  <p style="${MUTED}">
    En Eture llevamos desde 2015 acompañando a familias en este camino: más de 700 jugadores y jugadoras
    han dado ya el salto a universidades de la NCAA, la NAIA y JUCO.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e5e7eb;border-radius:10px;">
    <tr>
      <td style="padding:20px;">
        <p style="margin:0 0 12px;font-weight:bold;">Cómo trabajamos</p>
        <p style="margin:0 0 8px;color:#374151;"><strong>1. Valoración del perfil.</strong> Nivel deportivo, expediente académico e inglés.</p>
        <p style="margin:0 0 8px;color:#374151;"><strong>2. Plan a medida.</strong> Vídeo, exámenes oficiales y contacto directo con entrenadores universitarios.</p>
        <p style="margin:0;color:#374151;"><strong>3. Acompañamiento hasta el campus.</strong> Beca, matrícula y visado, sin que tengáis que pelearos con el papeleo.</p>
      </td>
    </tr>
  </table>

  <p style="${MUTED}">El primer paso es una llamada sin compromiso para conocer a tu hijo o hija y resolver vuestras dudas.</p>
  ${button("Reservar una llamada informativa")}

  <p style="${MUTED}">Y si prefieres escribirnos, responde a este correo: lo lee una persona del equipo.</p>
  <p style="${SIGN}">Un saludo,<br />El equipo de Eture</p>`),
  steps: [
    {
      delayHours: 48,
      condition: "NO_CLICK",
      subject: "",
      html: wrap(`
  <p style="${P}">Hola {{firstName | de nuevo}},</p>
  <p style="${MUTED}">Te escribo con las tres preguntas que más nos hacen las familias en la primera llamada, por si os ayudan:</p>

  <p style="margin:0 0 4px;font-weight:bold;">¿Cuánto cuesta?</p>
  <p style="${MUTED}">Depende de la universidad y de la beca, que puede ser deportiva, académica o ambas. Muchas cubren buena parte de la matrícula, el alojamiento y la manutención. En la llamada os damos una estimación realista para vuestro caso.</p>

  <p style="margin:0 0 4px;font-weight:bold;">¿Y los estudios?</p>
  <p style="${MUTED}">Es una carrera universitaria completa con título oficial. El fútbol va de la mano de los estudios, no en su lugar: si no se aprueba, no se juega.</p>

  <p style="margin:0 0 4px;font-weight:bold;">¿Qué nivel hace falta?</p>
  <p style="${MUTED}">Hay sitio para muchos perfiles. Más de la mitad de nuestros jugadores han ido a División I, pero División II, NAIA y JUCO son también muy buenas opciones según el caso.</p>

  ${button("Hablar con el equipo de Eture")}
  <p style="${SIGN}">Un saludo,<br />El equipo de Eture</p>`),
    },
    {
      delayHours: 120,
      condition: "NO_CLICK",
      subject: "",
      html: wrap(`
  <p style="${P}">Hola {{firstName | familia}},</p>
  <p style="${MUTED}">Sé que es una decisión que se piensa con calma, así que no quiero insistir más de la cuenta.</p>
  <p style="${MUTED}">
    Si te viene mejor, responde a este correo con <strong>el año de nacimiento de tu hijo o hija, su
    posición y el equipo en el que juega</strong>, y te contamos qué opciones vemos antes incluso de hablar.
  </p>
  <p style="${SIGN}">Un saludo,<br />El equipo de Eture</p>`),
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
  subject: "{{firstName | Hola}}, ¿te ves jugando en una universidad de EE. UU.?",
  previewText: "Lo que necesitas para que los entrenadores americanos te vean",
  html: wrap(`
  <p style="${P}">Hola {{firstName | crack}},</p>
  <p style="${MUTED}">
    ¡Gracias por apuntarte! Jugar al fútbol en una universidad americana mientras estudias una carrera no es
    un sueño lejano: es lo que ya han hecho más de 700 jugadores y jugadoras con Eture.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e5e7eb;border-radius:10px;">
    <tr>
      <td style="padding:20px;">
        <p style="margin:0 0 12px;font-weight:bold;">Para valorar tu perfil necesitamos</p>
        <p style="margin:0 0 8px;color:#374151;"><strong>1. Un vídeo</strong> con tus mejores acciones. Aunque sea grabado con el móvil.</p>
        <p style="margin:0 0 8px;color:#374151;"><strong>2. Tu nivel de inglés</strong>, aproximado. No hace falta que sea perfecto.</p>
        <p style="margin:0;color:#374151;"><strong>3. Tus notas</strong> del último curso.</p>
      </td>
    </tr>
  </table>

  ${button("Quiero que valoréis mi perfil")}

  <p style="${MUTED}">Si eres menor de edad, enséñale este correo a tus padres: en Eture hablamos también con ellos y les explicamos todo el proceso.</p>
  <p style="${SIGN}">¡Nos vemos en el campo!<br />El equipo de Eture</p>`),
  steps: [
    {
      delayHours: 48,
      condition: "NO_CLICK",
      subject: "{{firstName | Oye}}, así te ven los entrenadores americanos",
      html: wrap(`
  <p style="${P}">Hola {{firstName | crack}},</p>
  <p style="${MUTED}">Un entrenador universitario recibe cientos de vídeos cada temporada y decide en los primeros 30 segundos. Tres consejos para que el tuyo no se quede fuera:</p>
  <p style="margin:0 0 8px;color:#374151;"><strong>Empieza por lo mejor.</strong> Tus tres mejores acciones, al principio.</p>
  <p style="margin:0 0 8px;color:#374151;"><strong>Que se sepa quién eres.</strong> Marca tu jugador antes de cada jugada (un círculo o una flecha).</p>
  <p style="margin:0 0 16px;color:#374151;"><strong>Corto.</strong> Entre 3 y 5 minutos es suficiente.</p>
  <p style="${MUTED}">¿No tienes vídeo todavía? No pasa nada: te ayudamos a montarlo.</p>
  ${button("Enviar mi perfil")}
  <p style="${SIGN}">El equipo de Eture</p>`),
    },
    {
      delayHours: 120,
      condition: "NO_CLICK",
      subject: "",
      html: wrap(`
  <p style="${P}">Hola {{firstName | crack}},</p>
  <p style="${MUTED}">Te lo pongo fácil: responde a este correo con estas tres cosas y te decimos qué opciones ves tú en EE. UU.:</p>
  <p style="margin:0 0 8px;color:#374151;">• Año de nacimiento</p>
  <p style="margin:0 0 8px;color:#374151;">• Posición</p>
  <p style="margin:0 0 16px;color:#374151;">• Equipo y categoría en la que juegas</p>
  <p style="${SIGN}">El equipo de Eture</p>`),
    },
  ],
};

export const LEAD_PLAYBOOKS: Record<"PARENT" | "PLAYER", Playbook> = { PARENT, PLAYER };

export function playbookFor(audience: string): Playbook | null {
  return audience === "PARENT" ? PARENT : audience === "PLAYER" ? PLAYER : null;
}
