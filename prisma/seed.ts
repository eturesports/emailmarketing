/**
 * Datos iniciales: plantillas de ejemplo y listas base.
 *
 * Es idempotente, así que se puede lanzar tantas veces como haga falta:
 *
 *   npm run db:seed
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LISTS = [
  { name: "Newsletter", description: "Comunidad suscrita al boletín general.", color: "#22d3ee" },
  { name: "Prensa y medios", description: "Periodistas y medios de esports.", color: "#818cf8" },
  { name: "Patrocinadores", description: "Contactos comerciales y marcas.", color: "#34d399" },
  { name: "Jugadores y staff", description: "Equipos, entrenadores y personal.", color: "#fbbf24" },
];

const BASE_STYLE = "font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111827;max-width:600px;margin:0 auto;";

/** Plantillas largas que viven como HTML completo en prisma/templates. */
function templateFile(name: string): string {
  return readFileSync(join(__dirname, "templates", name), "utf8");
}

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
    name: "Programas 2027 · Jugadores y padres (EN)",
    category: "Programas",
    subject: "{{firstName | Hi}}, your pathway to college soccer starts in Spain",
    previewText: "Five programs, one pathway: summer camp, high school, gap year, college transfer and a one-week trial.",
    html: templateFile("programas-jugadores-padres.en.html"),
  },
  {
    name: "Programas 2027 · Jugadores y padres (ES)",
    category: "Programas",
    subject: "{{firstName | Hola}}, tu camino al fútbol universitario empieza en España",
    previewText: "Cinco programas, un solo camino: campus de verano, instituto, gap year, transfer universitario y una prueba de una semana.",
    html: templateFile("programas-jugadores-padres.es.html"),
  },
  // Newsletters de dic 2026 – ene 2027. El HTML lo generan los scripts de
  // scripts/newsletters; el número indica el orden de envío previsto.
  {
    name: "Newsletter 1 · MLS NEXT Fest Phoenix (EN)",
    category: "Newsletter",
    subject: "{{firstName | Hi}}, we'll be at MLS NEXT Fest in Phoenix",
    previewText: "Dec 2–13 · Phoenix, Arizona. Our recruiting team will be at the fields — let's meet in person.",
    html: templateFile("mls-next-fest-2026.en.html"),
  },
  {
    name: "Newsletter 1 · MLS NEXT Fest Phoenix (ES)",
    category: "Newsletter",
    subject: "{{firstName | Hola}}, estaremos en el MLS NEXT Fest de Phoenix",
    previewText: "Del 2 al 13 de diciembre · Phoenix, Arizona. Nuestro equipo de reclutamiento estará en los campos: veámonos en persona.",
    html: templateFile("mls-next-fest-2026.es.html"),
  },
  {
    name: "Newsletter 3 · Temporada 25/26 y Navidad (EN)",
    category: "Newsletter",
    subject: "180 placements: our record season (and a thank-you)",
    previewText: "Season 25/26 in numbers: 180 college placements, our best year ever. Thank you, and Merry Christmas.",
    html: templateFile("temporada-25-26-navidad.en.html"),
  },
  {
    name: "Newsletter 3 · Temporada 25/26 y Navidad (ES)",
    category: "Newsletter",
    subject: "180 colocaciones: nuestra temporada récord (y un gracias)",
    previewText: "La temporada 25/26 en cifras: 180 colocaciones universitarias, nuestro mejor año. Gracias, y feliz Navidad.",
    html: templateFile("temporada-25-26-navidad.es.html"),
  },
  {
    name: "Newsletter 4 · Planifica 2027 (EN)",
    category: "Newsletter",
    subject: "{{firstName | Hi}}, your 2027 month by month",
    previewText: "Showcase in February, trials in March, Summer Camp in June: the dates that decide a college roster spot in 2028.",
    html: templateFile("planifica-2027.en.html"),
  },
  {
    name: "Newsletter 4 · Planifica 2027 (ES)",
    category: "Newsletter",
    subject: "{{firstName | Hola}}, tu 2027 mes a mes",
    previewText: "Showcase en febrero, pruebas en marzo, Summer Camp en junio: las fechas que deciden una plaza universitaria en 2028.",
    html: templateFile("planifica-2027.es.html"),
  },
  {
    name: "Newsletter 5 · Spring Break Trials (EN)",
    category: "Newsletter",
    subject: "Spring break in Spain: 3 weeks to choose, €1,600 all in",
    previewText: "One week with Eture FC: training, a showcase match and LaLiga. Three weeks in March, €1,600 all in.",
    html: templateFile("spring-break-trials-2027.en.html"),
  },
  {
    name: "Newsletter 5 · Spring Break Trials (ES)",
    category: "Newsletter",
    subject: "Tu spring break en España: 3 semanas para elegir, 1.600 € todo incluido",
    previewText: "Una semana con el Eture FC: entrenamientos, un partido showcase y LaLiga. Tres semanas en marzo, 1.600 € todo incluido.",
    html: templateFile("spring-break-trials-2027.es.html"),
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
