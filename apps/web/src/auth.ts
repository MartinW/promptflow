import NextAuth, { type NextAuthResult } from "next-auth";
import Google from "next-auth/providers/google";

const parseList = (s: string | undefined) =>
  s
    ?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean) ?? [];

const allowedEmails = parseList(process.env.AUTH_ALLOWED_EMAILS);
const allowedDomains = parseList(process.env.AUTH_ALLOWED_EMAIL_DOMAINS);

function isAllowed(email: string | null | undefined): boolean {
  if (!allowedEmails.length && !allowedDomains.length) return true;
  if (!email) return false;
  const lower = email.toLowerCase();
  if (allowedEmails.includes(lower)) return true;
  const domain = lower.split("@")[1];
  return domain ? allowedDomains.includes(domain) : false;
}

export const authEnabled = !!(
  process.env.AUTH_SECRET &&
  process.env.AUTH_GOOGLE_ID &&
  process.env.AUTH_GOOGLE_SECRET
);

const real = authEnabled
  ? NextAuth({
      providers: [Google],
      pages: { signIn: "/sign-in" },
      callbacks: {
        signIn({ user }) {
          return isAllowed(user.email);
        },
      },
    })
  : null;

const notFound = async () => new Response("Not found", { status: 404 });

export const handlers: NextAuthResult["handlers"] = real?.handlers ?? {
  GET: notFound,
  POST: notFound,
};
export const auth: NextAuthResult["auth"] = (real?.auth ??
  (async () => null)) as NextAuthResult["auth"];
export const signIn: NextAuthResult["signIn"] = (real?.signIn ??
  (async () => {
    throw new Error("Auth is not configured on this deployment.");
  })) as NextAuthResult["signIn"];
export const signOut: NextAuthResult["signOut"] = (real?.signOut ??
  (async () => {
    throw new Error("Auth is not configured on this deployment.");
  })) as NextAuthResult["signOut"];
