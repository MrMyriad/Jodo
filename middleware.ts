export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workflows/:path*",
    "/templates/:path*",
    "/connections/:path*",
    "/settings/:path*",
  ],
};
