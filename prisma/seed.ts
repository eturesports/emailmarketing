/**
 * Datos iniciales: plantillas de ejemplo y listas base.
 *
 * Es idempotente, así que se puede lanzar tantas veces como haga falta:
 *
 *   npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LISTS = [
  { name: "Newsletter", description: "Comunidad suscrita al boletín general.", color: "#22d3ee" },
  { name: "Prensa y medios", description: "Periodistas y medios de esports.", color: "#818cf8" },
  { name: "Patrocinadores", description: "Contactos comerciales y marcas.", color: "#34d399" },
  { name: "Jugadores y staff", description: "Equipos, entrenadores y personal.", color: "#fbbf24" },
];

const BASE_STYLE = "font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;";

const TEMPLATES = [
  {
    name: "Newsletter mensual",
    category: "Newsletter",
    subject: "{{firstName | Hola}}, esto es lo último de Eture",
    previewText: "Resultados, fichajes y próximos torneos",
    html: `<div style="${BASE_STYLE}">
  <div style="background:#070b12;padding:28px 24px;border-radius:12px 12px 0 0;">
    <h1 style="color:#22d3ee;font-size:24px;margin:0;">Eture Esports</h1>
    <p style="color:#93a4c0;font-size:13px;margin:6px 0 0;">Boletín mensual</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:28px 24px;">
    <p style="margin:0 0 16px;">Hola {{firstName | equipo}},</p>
    <p style="margin:0 0 16px;">Te contamos lo más destacado de este mes.</p>

    <h2 style="font-size:17px;margin:28px 0 8px;">Resultados</h2>
    <p style="margin:0 0 16px;color:#374151;">Escribe aquí los resultados de la temporada.</p>

    <h2 style="font-size:17px;margin:28px 0 8px;">Próximos torneos</h2>
    <p style="margin:0 0 24px;color:#374151;">Fechas, horarios y dónde seguirlos.</p>

    <p style="margin:0 0 28px;">
      <a href="https://eturesports.com" style="display:inline-block;background:#0891b2;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">Ver el calendario</a>
    </p>

    <p style="margin:0;color:#6b7280;font-size:13px;">Un saludo,<br />El equipo de Eture Esports</p>
  </div>
</div>`,
  },
  {
    name: "Nota de prensa",
    category: "Prensa",
    subject: "Nota de prensa · Eture Esports",
    previewText: "Información para medios",
    html: `<div style="${BASE_STYLE}">
  <p style="text-transform:uppercase;letter-spacing:1px;font-size:11px;color:#6b7280;margin:0 0 8px;">Nota de prensa</p>
  <h1 style="font-size:22px;margin:0 0 20px;line-height:1.3;">Titular de la noticia</h1>

  <p style="margin:0 0 16px;">Buenos días {{firstName | compañero}},</p>
  <p style="margin:0 0 16px;color:#374151;">Primer párrafo con la información principal: qué, quién, cuándo y dónde.</p>
  <p style="margin:0 0 16px;color:#374151;">Segundo párrafo con el contexto y las declaraciones.</p>

  <div style="border-left:3px solid #0891b2;padding:4px 0 4px 16px;margin:24px 0;color:#374151;font-style:italic;">
    «Cita destacada de un portavoz del club.»
  </div>

  <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">
    Material gráfico y ampliación de información:<br />
    <a href="mailto:prensa@eturesports.com" style="color:#0369a1;">prensa@eturesports.com</a>
  </p>
</div>`,
  },
  {
    name: "Propuesta a patrocinadores",
    category: "Comercial",
    subject: "{{company | Vuestra marca}} y Eture Esports",
    previewText: "Propuesta de colaboración",
    html: `<div style="${BASE_STYLE}">
  <p style="margin:0 0 16px;">Hola {{firstName}},</p>
  <p style="margin:0 0 16px;color:#374151;">
    Te escribo desde Eture Esports. Hemos preparado una propuesta de colaboración pensada para
    {{company | vuestra marca}}.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e5e7eb;border-radius:10px;">
    <tr>
      <td style="padding:20px;">
        <p style="margin:0 0 12px;font-weight:bold;">Qué incluye</p>
        <p style="margin:0 0 6px;color:#374151;">• Presencia de marca en equipaciones y directos</p>
        <p style="margin:0 0 6px;color:#374151;">• Activaciones con la comunidad</p>
        <p style="margin:0;color:#374151;">• Contenido de marca en nuestras redes</p>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 28px;color:#374151;">¿Te viene bien una llamada de 20 minutos esta semana?</p>

  <p style="margin:0;color:#6b7280;font-size:13px;">Un saludo,<br />Departamento comercial · Eture Esports</p>
</div>`,
  },
  {
    // MLS NEXT Fest 2026: 2–13 de diciembre, Arizona Athletic Grounds y Red
    // Mountain Park (Mesa, área de Phoenix). Va en inglés porque las familias
    // de MLS NEXT son de EE. UU. La llamada a la acción es responder al correo:
    // sale por Gmail y la respuesta cae en el buzón del remitente, sin depender
    // de un enlace de reservas externo.
    name: "MLS NEXT Fest Arizona · Let's Meet",
    category: "Eventos",
    subject: "{{firstName | Hi}}, let's meet in Arizona at MLS NEXT Fest",
    previewText: "ETURE Soccer will be in Mesa, Dec 2–13. Grab 20 minutes with our staff.",
    html: `<div style="${BASE_STYLE}">
  <div style="background:#0b1f17;padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
    <p style="color:#86efac;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">MLS NEXT Fest · Mesa, AZ · Dec 2–13</p>
    <h1 style="color:#ffffff;font-size:28px;line-height:1.2;margin:0;">ETURE SOCCER<br />Let's Meet in Arizona</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:28px 24px;">
    <p style="margin:0 0 16px;">Hi {{firstName | there}},</p>
    <p style="margin:0 0 16px;color:#374151;">
      Our team will be at <strong>MLS NEXT Fest in Mesa, Arizona</strong> from
      <strong>December 2 to 13</strong>, watching games at Arizona Athletic Grounds and Red Mountain Park.
    </p>
    <p style="margin:0 0 16px;color:#374151;">
      While we're there, we'd love to sit down with you and your player for a relaxed,
      no-commitment conversation: where they are today, what they want from the next few
      years, and whether one of our programs could help them get there.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 12px;font-weight:bold;color:#14532d;">In 20 minutes we can talk about</p>
          <p style="margin:0 0 6px;color:#374151;">• Our gap-year program in Valencia, Spain: full-time professional training in a European football environment</p>
          <p style="margin:0 0 6px;color:#374151;">• How players keep their college eligibility while they train with us</p>
          <p style="margin:0 0 6px;color:#374151;">• The path from ETURE to NCAA rosters, and how we support recruiting</p>
          <p style="margin:0;color:#374151;">• Your questions: timing, academics, cost and what a typical year looks like</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-weight:bold;">Setting it up is easy</p>
    <p style="margin:0 0 24px;color:#374151;">
      Just <strong>reply to this email</strong> with the days you'll be in Mesa and your player's
      age group. We'll fit around your game schedule and meet you right at the fields.
    </p>

    <p style="margin:0 0 28px;text-align:center;">
      <a href="https://eturesports.com" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:8px;font-weight:bold;">Learn more about ETURE</a>
    </p>

    <p style="margin:0 0 16px;color:#374151;">Spots during the event are limited, so the sooner you reply, the easier it is to find a time that works.</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">See you in Arizona,<br />The ETURE Soccer team</p>
  </div>
</div>`,
  },
  {
    // Seguimiento para la secuencia: 4–5 días después, a quien no abrió o no respondió.
    name: "MLS NEXT Fest Arizona · Recordatorio",
    category: "Eventos",
    subject: "Still time to meet us in Mesa, {{firstName | there}}?",
    previewText: "We're at MLS NEXT Fest Dec 2–13. Reply with your dates.",
    html: `<div style="${BASE_STYLE}">
  <p style="margin:0 0 16px;">Hi {{firstName | there}},</p>
  <p style="margin:0 0 16px;color:#374151;">
    A quick follow-up: the ETURE Soccer team will be at <strong>MLS NEXT Fest in Mesa (Dec 2–13)</strong>
    and we're putting together our meeting schedule this week.
  </p>
  <p style="margin:0 0 16px;color:#374151;">
    If you'd like 20 minutes to hear how our gap-year program in Spain helps players develop
    and reach college soccer, without losing eligibility, just reply with the days you'll be there.
    We'll come to you between games.
  </p>
  <p style="margin:0;color:#6b7280;font-size:13px;">Hope to see you at the fields,<br />The ETURE Soccer team</p>
</div>`,
  },
  {
    name: "Aviso corto",
    category: "General",
    subject: "{{firstName}}, información importante",
    previewText: "Un aviso rápido",
    html: `<div style="${BASE_STYLE}">
  <p style="margin:0 0 16px;">Hola {{firstName | equipo}},</p>
  <p style="margin:0 0 16px;color:#374151;">Escribe aquí el aviso.</p>
  <p style="margin:0;color:#6b7280;font-size:13px;">Gracias,<br />Eture Esports</p>
</div>`,
  },
];

async function main(): Promise<void> {
  for (const list of LISTS) {
    await prisma.contactList.upsert({
      where: { name: list.name },
      create: list,
      update: {},
    });
  }
  console.log(`✔ ${LISTS.length} listas listas`);

  for (const template of TEMPLATES) {
    const existing = await prisma.template.findFirst({ where: { name: template.name } });
    if (existing) continue;
    await prisma.template.create({ data: template });
  }
  console.log(`✔ ${TEMPLATES.length} plantillas listas`);

  console.log("\nSemilla completada. Arranca la aplicación con `npm run dev` y entra con tu cuenta de Google.");
}

main()
  .catch((error) => {
    console.error("Error al sembrar la base de datos:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
