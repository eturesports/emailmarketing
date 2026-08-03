import { SignJWT } from "jose";
import { prisma } from "../src/lib/db";
import { runImport } from "../src/lib/import";

async function main() {
  const user = await prisma.user.upsert({
    where: { googleId: "demo-google-id" },
    create: {
      googleId: "demo-google-id", email: "marketing@eture.es", name: "Marina Baquero",
      role: "OWNER", fromName: "Eture Esports", dailyQuota: 1500,
    },
    update: {},
  });

  const listas = await prisma.contactList.findMany();
  const news = listas.find((l) => l.name === "Newsletter")!;
  const prensa = listas.find((l) => l.name === "Prensa y medios")!;

  const nombres = [
    ["ana.garcia", "Ana", "García", "Eture Esports", "Valorant"],
    ["luis.perez", "Luis", "Pérez", "Club Ejemplo", "League of Legends"],
    ["marta.ruiz", "Marta", "Ruiz", "Patrocinador SL", "Rocket League"],
    ["javier.lopez", "Javier", "López", "Medios Gaming", "Valorant"],
    ["sara.moreno", "Sara", "Moreno", "Esports Daily", "CS2"],
    ["diego.torres", "Diego", "Torres", "Arena Media", "League of Legends"],
    ["lucia.navarro", "Lucía", "Navarro", "Brand Co", "Fortnite"],
    ["pablo.gil", "Pablo", "Gil", "Eture Esports", "CS2"],
  ];

  const rows = nombres.map(([slug, nombre, apellidos, empresa, equipo]) => ({
    email: `${slug}@ejemplo.com`, nombre, apellidos, empresa, equipo,
  }));

  await runImport({
    rows,
    mapping: { email: "email", nombre: "firstName", apellidos: "lastName", empresa: "company", equipo: "custom:equipo" },
    listIds: [news.id, prensa.id],
    updateExisting: true, resubscribe: false, userId: user.id, filename: "contactos-demo.csv",
  });

  // Una campaña enviada con métricas, para ver el informe
  const plantilla = await prisma.template.findFirst({ where: { name: "Newsletter mensual" } });
  const enviada = await prisma.campaign.upsert({
    where: { id: "demo-campaign-sent" },
    create: {
      id: "demo-campaign-sent", name: "Newsletter de marzo",
      subject: "{{firstName}}, esto es lo último de Eture", html: plantilla?.html ?? "<p>Hola</p>",
      senderId: user.id, status: "SENT", fromName: "Eture Esports",
      totalRecipients: 8, sentCount: 8, openCount: 5, clickCount: 3, unsubCount: 1, failedCount: 0,
      startedAt: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 86000000),
      lists: { create: [{ listId: news.id }] },
    },
    update: {},
  });

  const contactos = await prisma.contact.findMany({ take: 8 });
  for (const [i, c] of contactos.entries()) {
    await prisma.recipient.upsert({
      where: { campaignId_contactId: { campaignId: enviada.id, contactId: c.id } },
      create: {
        campaignId: enviada.id, contactId: c.id, status: "SENT",
        sentAt: new Date(Date.now() - 86000000 + i * 60000),
        openCount: i < 5 ? i + 1 : 0, firstOpenedAt: i < 5 ? new Date() : null,
        clickCount: i < 3 ? 1 : 0, firstClickedAt: i < 3 ? new Date() : null,
      },
      update: {},
    });
  }
  for (const [url, n] of [["https://eture.es/calendario", 2], ["https://eture.es/tienda", 1]] as const) {
    const existing = await prisma.event.count({ where: { campaignId: enviada.id, url } });
    if (!existing) {
      for (let i = 0; i < n; i++) {
        await prisma.event.create({ data: { type: "CLICK", campaignId: enviada.id, url } });
      }
    }
  }

  // Un borrador
  await prisma.campaign.upsert({
    where: { id: "demo-campaign-draft" },
    create: {
      id: "demo-campaign-draft", name: "Anuncio de fichaje", subject: "Bienvenido al equipo",
      html: plantilla?.html ?? "<p>Hola</p>", senderId: user.id, status: "DRAFT",
      lists: { create: [{ listId: prensa.id }] },
    },
    update: {},
  });

  const token = await new SignJWT({ userId: user.id })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d")
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET!));

  console.log(token);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
