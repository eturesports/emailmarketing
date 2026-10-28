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
    name: "Lanzamiento app Recruiting · Coaches NCAA/NAIA/NJCAA",
    category: "Comercial",
    subject: "{{firstName | Coach}}, every ETURE player is now in one app",
    previewText: "International, Spanish and domestic players. Tell us what you need and we match you.",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1d1d1f;max-width:600px;margin:0 auto;">
  <div style="background:#9f1b20;padding:28px 28px 24px;border-radius:12px 12px 0 0;">
    <p style="color:#ffffff;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0;font-weight:bold;">ETURE Sports</p>
    <h1 style="color:#ffffff;font-size:26px;line-height:1.25;margin:10px 0 0;">Our recruiting app is live</h1>
    <p style="color:#f3d6d7;font-size:14px;margin:8px 0 0;">Every player we work with, in one place. Built for college coaches.</p>
  </div>

  <div style="border:1px solid #e5e5ea;border-top:0;border-radius:0 0 12px 12px;padding:28px;">
    <p style="margin:0 0 16px;">Hi {{firstName | Coach}},</p>
    <p style="margin:0 0 16px;">
      Over the past few years ETURE has placed more than 700 student-athletes in college soccer programs across
      NCAA Division I, II and III, NAIA and NJCAA. More than 300 of them are on a college roster right now.
    </p>
    <p style="margin:0 0 24px;">
      We have now opened our recruiting app to coaches. It gives
      {{company | your program}} direct access to every profile our agency works with, so you no longer have to wait for us
      to send a PDF.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e5e5ea;border-radius:10px;">
      <tr>
        <td style="padding:20px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 14px;font-weight:bold;font-size:16px;">What you get in the app</p>

          <p style="margin:0 0 4px;font-weight:bold;color:#9f1b20;">1. Tell us what you need</p>
          <p style="margin:0 0 14px;color:#3a3a3c;">
            Let us know the positions you need to fill, the class year and the profile you are looking for.
            Our staff receives your request directly and comes back to you with players who fit.
          </p>

          <p style="margin:0 0 4px;font-weight:bold;color:#9f1b20;">2. See every profile we work with</p>
          <p style="margin:0 0 10px;color:#3a3a3c;">Browse the full pool of players our agency represents, in three groups:</p>
          <p style="margin:0 0 6px;color:#3a3a3c;">&bull; <strong>International players</strong> from around the world</p>
          <p style="margin:0 0 6px;color:#3a3a3c;">&bull; <strong>Spanish players</strong> from our programs in Spain</p>
          <p style="margin:0 0 14px;color:#3a3a3c;">&bull; <strong>American (domestic) players</strong> from our U.S. programs</p>

          <p style="margin:0 0 4px;font-weight:bold;color:#9f1b20;">3. One point of contact</p>
          <p style="margin:0;color:#3a3a3c;">
            When a player catches your eye, our team handles the rest: film, academics and the conversation with the family.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 28px;text-align:center;">
      <a href="https://recruiting.eturesports.com" style="display:inline-block;background:#9f1b20;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:bold;font-size:15px;">Get coach access</a>
    </p>

    <p style="margin:0 0 16px;">
      If you already have needs for the next recruiting cycle,
      just reply to this email with the positions you are looking for and we will send you a first shortlist.
    </p>

    <p style="margin:0;color:#3a3a3c;">
      Best regards,<br />
      <strong>The ETURE Sports recruiting team</strong><br />
      <a href="https://www.eturesports.com" style="color:#9f1b20;">eturesports.com</a>
    </p>

    <p style="margin:24px 0 0;color:#86868b;font-size:12px;line-height:1.5;">
      ETURE Sports · [POSTAL ADDRESS]
    </p>
  </div>
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
