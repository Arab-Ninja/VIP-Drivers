import NextAuth, { type DefaultSession } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import type { UserRole } from "@/db/schema";
import { env } from "@/lib/env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      phone: string | null;
      blocked: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role?: UserRole;
    phone?: string | null;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/** bcrypt cost. 12 is the current sensible default for interactive logins. */
export const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * A hash of a throwaway value, compared against when no account exists for the
 * submitted address. Without it, a missing user returns far faster than a
 * wrong password, which leaks whether an email is registered.
 */
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7pQ2Zk5G1u2Cq2b4Z5rQ8mFq3vHqvSa";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  secret: env.authSecret,
  // Credentials sign-in requires JWT sessions; the adapter still persists
  // users and linked OAuth accounts.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,

  providers: [
    ...(env.google.enabled
      ? [
          Google({
            clientId: env.google.clientId,
            clientSecret: env.google.clientSecret,
            // Google verifies the addresses it returns, so linking a Google
            // login to an existing password account of the same address is
            // safe and avoids a confusing duplicate-account dead end.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

        // Always run a comparison so the response time does not reveal
        // whether the account exists.
        const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !user.passwordHash || !ok) return null;
        if (user.blockedAt) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          phone: user.phone,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign-in, and on every explicit session update, re-read the
      // authoritative role from the database. A role changed by an admin then
      // takes effect without waiting for the token to expire.
      if (user?.id) token.sub = user.id;

      if (user || trigger === "update" || token.role === undefined) {
        const id = (user?.id ?? token.sub) as string | undefined;
        if (id) {
          const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
          if (row) {
            let role = row.role;

            // Bootstrap: the first sign-in of a listed address becomes admin.
            // This is the only path to creating the initial administrator.
            if (
              role !== "admin" &&
              row.email &&
              env.adminEmails.includes(row.email.toLowerCase())
            ) {
              await db.update(users).set({ role: "admin" }).where(eq(users.id, row.id));
              role = "admin";
            }

            token.role = role;
            token.phone = row.phone;
            token.name = row.name;
            token.picture = row.image;
            token.blocked = Boolean(row.blockedAt);
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as UserRole) ?? "client";
        session.user.phone = (token.phone as string | null) ?? null;
        session.user.blocked = Boolean(token.blocked);
      }
      return session;
    },

    async signIn({ user }) {
      // A blocked account can never establish a session, by any provider.
      if (!user?.email) return true;
      const [row] = await db
        .select({ blockedAt: users.blockedAt })
        .from(users)
        .where(eq(users.email, user.email.toLowerCase()))
        .limit(1);
      return !row?.blockedAt;
    },
  },
});

/* ------------------------------------------------------------------ */
/* Server-side guards                                                  */
/* ------------------------------------------------------------------ */

export class AuthorizationError extends Error {
  constructor(public readonly reason: "unauthenticated" | "forbidden") {
    super(reason);
    this.name = "AuthorizationError";
  }
}

/** Returns the signed-in user, or null. Never throws. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Returns the signed-in user, or throws so a layout can redirect. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("unauthenticated");
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireUser();
  // Admins are explicitly granted access to every area of the site.
  if (user.role === "admin" || roles.includes(user.role)) return user;
  throw new AuthorizationError("forbidden");
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === "admin";
}
