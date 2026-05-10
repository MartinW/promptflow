import NextAuth from "next-auth";
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/sign-in" },
  callbacks: {
    signIn({ user }) {
      return isAllowed(user.email);
    },
  },
});
