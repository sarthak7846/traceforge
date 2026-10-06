import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  console.log("cookies got", request.cookies.has("token"), request.url);
  const hasToken = request.cookies.has("token");

  if (!hasToken) {
    const url = request.nextUrl;
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};