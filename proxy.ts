import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    const session = await auth();
    
    // Хэрэв нэвтрээгүй бол нэвтрэх хуудас руу шилжүүлнэ
    if (!session.userId) {
      return session.redirectToSignIn();
    }

    // Clerk-ээс хэрэглэгчийн эрхийг (metadata) шалгах
    const metadata = session.sessionClaims?.metadata as { role?: string } | undefined;
    const role = metadata?.role;

    if (role !== "admin") {
      // Хэрэв admin биш бол нүүр хуудас руу буцаана
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jsm|jsx|mjs|svg|png|jpg|jpeg|gif|webp|pdf|ico|txt|conf|woff2?|ttf|eot|otf|cljs|cljc|clj|edn|ts|tsx)).*)',
    '/(api|trpc)(.*)',
  ],
};
