import { auth, authEnabled } from "@/auth";
import {
  isProductionEnvironment,
  validateProductionAuth,
  sanitizeRedirect,
} from "@/lib/auth-guard";

export default auth((req) => {
  const host = req.headers.get("host");
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/sign-in" || pathname.startsWith("/api/auth");

  // Production without proper auth config: fail closed
  if (isProductionEnvironment(host)) {
    const configError = validateProductionAuth();
    if (configError) {
      return new Response(
        `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Required - PromptFlow</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .container {
      max-width: 32rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 2rem;
    }
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
    }
    p {
      margin: 0.5rem 0;
      color: #a3a3a3;
      line-height: 1.6;
    }
    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin: 1rem 0;
      color: #fca5a5;
    }
    code {
      background: #2a2a2a;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
    a {
      color: #60a5fa;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔒 Authentication Required</h1>
    <p>This PromptFlow deployment is running in production mode but authentication is not properly configured.</p>
    <div class="error">${configError}</div>
    <p><strong>Required environment variables:</strong></p>
    <ul style="color: #a3a3a3; line-height: 1.8;">
      <li><code>AUTH_SECRET</code></li>
      <li><code>AUTH_GOOGLE_ID</code></li>
      <li><code>AUTH_GOOGLE_SECRET</code></li>
      <li><code>AUTH_ALLOWED_EMAILS</code> or <code>AUTH_ALLOWED_EMAIL_DOMAINS</code></li>
    </ul>
    <p>See the <a href="https://github.com/MartinW/promptflow#authentication" target="_blank">README</a> for setup instructions.</p>
  </div>
</body>
</html>
        `.trim(),
        {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }
  }

  // Auth is enabled and user is not authenticated: redirect to sign-in
  if (authEnabled && !req.auth && !isPublic) {
    const url = new URL("/sign-in", req.nextUrl.origin);
    const safeRedirect = sanitizeRedirect(pathname, "/prompts");
    url.searchParams.set("redirectTo", safeRedirect);
    return Response.redirect(url);
  }

  // Allow through
  return undefined;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
