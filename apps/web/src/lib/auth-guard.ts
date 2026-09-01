import { auth, authEnabled } from "@/auth";
import type { Session } from "next-auth";

/**
 * Determines if the current environment is localhost or local-dev.
 * 
 * Checks:
 * - Request host is loopback (localhost, 127.0.0.1, [::1])
 * - NODE_ENV=development (and NOT on Vercel production)
 */
export function isLocalEnvironment(host: string | null): boolean {
  if (!host) return false;
  
  const normalizedHost = host.toLowerCase().split(":")[0]; // Strip port
  const isLoopback = 
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "[::1]";
  
  if (isLoopback) return true;
  
  // NODE_ENV=development without Vercel production deployment
  const isDev = process.env.NODE_ENV === "development";
  const isVercelProduction = process.env.VERCEL_ENV === "production";
  
  return isDev && !isVercelProduction;
}

/**
 * Determines if the current environment is production/public deployment.
 * 
 * Returns true when:
 * - VERCEL_ENV=production, OR
 * - NODE_ENV=production with a non-loopback host
 */
export function isProductionEnvironment(host: string | null): boolean {
  if (process.env.VERCEL_ENV === "production") return true;
  
  if (process.env.NODE_ENV === "production") {
    return !isLocalEnvironment(host);
  }
  
  return false;
}

/**
 * Determines if authentication should be required based on the environment.
 * 
 * - Local/dev: auth is optional (fail-open)
 * - Production: auth is required (fail-closed)
 */
export function isAuthRequired(host: string | null): boolean {
  return isProductionEnvironment(host);
}

/**
 * Validates that production environments have proper auth configuration.
 * 
 * Production requires:
 * - All AUTH_* env vars configured
 * - At least one of AUTH_ALLOWED_EMAILS or AUTH_ALLOWED_EMAIL_DOMAINS set
 * 
 * Returns null if valid, or an error message if misconfigured.
 */
export function validateProductionAuth(): string | null {
  if (!authEnabled) {
    return "Authentication is not configured. Set AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET.";
  }
  
  const hasAllowlist = 
    (process.env.AUTH_ALLOWED_EMAILS && process.env.AUTH_ALLOWED_EMAILS.trim()) ||
    (process.env.AUTH_ALLOWED_EMAIL_DOMAINS && process.env.AUTH_ALLOWED_EMAIL_DOMAINS.trim());
  
  if (!hasAllowlist) {
    return "Production deployments require an allowlist. Set AUTH_ALLOWED_EMAILS or AUTH_ALLOWED_EMAIL_DOMAINS.";
  }
  
  return null;
}

/**
 * Enforces authentication for server actions and API routes.
 * 
 * Behavior:
 * - Local: returns null if auth is disabled (allows unauthenticated access)
 * - Production: throws error if auth is not configured, or returns 401 Response if unauthenticated
 * 
 * Usage in server actions:
 *   const session = await requireAuth(headers().get("host"));
 *   if (session instanceof Response) return session;
 *   // session is now Session | null (null only in local mode)
 * 
 * Usage in API routes:
 *   const session = await requireAuth(req.headers.get("host"));
 *   if (session instanceof Response) return session;
 */
export async function requireAuth(host: string | null): Promise<Session | null | Response> {
  const isLocal = isLocalEnvironment(host);
  const isProd = isProductionEnvironment(host);
  
  // Production: validate configuration
  if (isProd) {
    const configError = validateProductionAuth();
    if (configError) {
      return new Response(
        JSON.stringify({
          error: "Authentication not configured",
          message: configError,
        }),
        { 
          status: 503,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
  
  // Check authentication
  const session = await auth();
  
  // Local without auth configured: allow through
  if (isLocal && !authEnabled) {
    return null;
  }
  
  // Require authenticated session in production (or local with auth enabled)
  if (!session) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
  
  return session;
}

/**
 * Sanitizes a redirect URL to prevent open redirects.
 * 
 * Only allows:
 * - Relative paths starting with `/` (but not `//`)
 * - Rejects absolute URLs
 * 
 * Returns the sanitized path, or a safe default if invalid.
 */
export function sanitizeRedirect(redirectTo: string | null | undefined, fallback = "/"): string {
  if (!redirectTo) return fallback;
  
  // Must start with single slash
  if (!redirectTo.startsWith("/")) return fallback;
  
  // Reject protocol-relative URLs (//example.com)
  if (redirectTo.startsWith("//")) return fallback;
  
  // Basic sanity: reject anything that looks like it has a protocol
  if (redirectTo.includes("://")) return fallback;
  
  return redirectTo;
}
