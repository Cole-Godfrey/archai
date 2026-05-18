import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

import {
  SIGN_IN_PATH,
  SIGN_IN_URL,
  SIGN_UP_PATH,
  SIGN_UP_URL,
  routePatternForPath,
} from "@/lib/auth-routes"

const isPublicRoute = createRouteMatcher([
  routePatternForPath(SIGN_IN_PATH),
  routePatternForPath(SIGN_UP_PATH),
])

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect()
    }
  },
  {
    signInUrl: SIGN_IN_URL,
    signUpUrl: SIGN_UP_URL,
  }
)

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
