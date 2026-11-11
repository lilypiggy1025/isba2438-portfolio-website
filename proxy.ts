import { NextResponse, type NextRequest } from "next/server";
import { blogStore } from "@/lib/blog/storage";

export async function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2];

  // Check existence before streaming can send a successful HTTP status.
  try {
    if (await blogStore.find(decodeURIComponent(slug))) return NextResponse.next();
  } catch (error) {
    // Let the page's error boundary handle storage failures.
    if (!(error instanceof URIError)) return NextResponse.next();
  }

  return NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
}

export const config = { matcher: "/blogs/:slug" };
