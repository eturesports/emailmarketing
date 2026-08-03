import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/google";
import { setOAuthState } from "@/lib/session";
import { absoluteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Arranca el flujo OAuth: guarda un `state` anti-CSRF y redirige a Google. */
export async function GET() {
  try {
    const state = crypto.randomBytes(24).toString("base64url");
    await setOAuthState(state);
    return NextResponse.redirect(buildAuthUrl(state));
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.redirect(absoluteUrl("/login?error=config"));
  }
}
