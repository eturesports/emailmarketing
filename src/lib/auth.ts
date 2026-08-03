import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { readSession } from "./session";
import { ROLE, type Role } from "./constants";
import { ApiError } from "./api";

export { ApiError };

/** Usuario de la sesión actual, o null si no hay sesión válida. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;

  return user;
}

/** Para páginas: exige sesión y redirige al login si no la hay. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Para páginas de administración. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== ROLE.OWNER && user.role !== ROLE.ADMIN) {
    redirect("/panel");
  }
  return user;
}

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === ROLE.OWNER || user.role === ROLE.ADMIN;
}

export function hasRole(user: Pick<User, "role">, ...roles: Role[]): boolean {
  return roles.includes(user.role as Role);
}

/** Para route handlers: exige sesión y lanza 401 si no la hay. */
export async function requireApiUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "No has iniciado sesión.");
  return user;
}

export async function requireApiAdmin(): Promise<User> {
  const user = await requireApiUser();
  if (!isAdmin(user)) throw new ApiError(403, "Necesitas permisos de administrador.");
  return user;
}
