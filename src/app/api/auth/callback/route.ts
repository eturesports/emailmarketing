import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { createOAuthClient, isEmailAllowed, persistCredentials } from "@/lib/google";
import { consumeOAuthState, createSession } from "@/lib/session";
import { absoluteUrl, env } from "@/lib/env";
import { ROLE, TRANSPORT } from "@/lib/constants";
import { safeEqual } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/**
 * Vuelta del consentimiento de Google: valida el `state`, canjea el código por
 * tokens, comprueba que el dominio esté autorizado y abre la sesión.
 */
/**
 * Crea el remitente por defecto de quien acaba de entrar.
 *
 * Un usuario recién autorizado ya puede enviar desde su propia dirección, así
 * que se le da de alta como remitente sin obligarle a configurarlo a mano. Si
 * ya existía uno con ese correo no se toca: puede haberlo ajustado alguien.
 */
async function ensureDefaultSender(userId: string, email: string, name: string | null): Promise<void> {
  const existing = await prisma.sender.findUnique({ where: { fromEmail: email } });

  if (existing) {
    // Reconecta el remitente con la cuenta si se había quedado huérfano.
    if (!existing.userId) {
      await prisma.sender.update({ where: { id: existing.id }, data: { userId } });
    }
    return;
  }

  await prisma.sender.create({
    data: {
      label: name ?? email,
      fromEmail: email,
      fromName: name,
      transport: TRANSPORT.GMAIL_API,
      userId,
    },
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(absoluteUrl("/login?error=denied"));
  }

  const expectedState = await consumeOAuthState();
  if (!expectedState || !state || !safeEqual(expectedState, state)) {
    return NextResponse.redirect(absoluteUrl("/login?error=state"));
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Sin gmail.send la plataforma no puede hacer su trabajo: mejor rechazar
    // aquí que dejar entrar y fallar en el primer envío.
    if (!tokens.scope?.includes("gmail.send")) {
      return NextResponse.redirect(absoluteUrl("/login?error=scope"));
    }

    const { data: profile } = await google.oauth2({ version: "v2", auth: client }).userinfo.get();

    if (!profile.email || !profile.id) {
      return NextResponse.redirect(absoluteUrl("/login?error=unknown"));
    }
    if (!isEmailAllowed(profile.email)) {
      return NextResponse.redirect(absoluteUrl("/login?error=domain"));
    }

    const email = profile.email.toLowerCase();

    // El primer usuario en entrar es el propietario; también se puede fijar por
    // OWNER_EMAIL para que no dependa del orden de llegada.
    const existingUsers = await prisma.user.count();
    const isOwner = env.ownerEmail ? env.ownerEmail === email : existingUsers === 0;

    const user = await prisma.user.upsert({
      where: { googleId: profile.id },
      create: {
        googleId: profile.id,
        email,
        name: profile.name ?? null,
        imageUrl: profile.picture ?? null,
        role: isOwner ? ROLE.OWNER : ROLE.MEMBER,
        lastLoginAt: new Date(),
      },
      update: {
        email,
        name: profile.name ?? null,
        imageUrl: profile.picture ?? null,
        lastLoginAt: new Date(),
        ...(isOwner ? { role: ROLE.OWNER } : {}),
      },
    });

    if (!user.isActive) {
      return NextResponse.redirect(absoluteUrl("/login?error=domain"));
    }

    await persistCredentials(user.id, tokens);
    await ensureDefaultSender(user.id, email, profile.name ?? null);
    await createSession(user.id);

    return NextResponse.redirect(absoluteUrl("/panel"));
  } catch (error) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(absoluteUrl("/login?error=unknown"));
  }
}
