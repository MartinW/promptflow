import { auth, authEnabled } from "@/auth";

export default authEnabled
  ? auth((req) => {
      const { pathname } = req.nextUrl;
      const isPublic = pathname === "/sign-in" || pathname.startsWith("/api/auth");
      if (!req.auth && !isPublic) {
        const url = new URL("/sign-in", req.nextUrl.origin);
        url.searchParams.set("redirectTo", pathname);
        return Response.redirect(url);
      }
    })
  : () => undefined;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
