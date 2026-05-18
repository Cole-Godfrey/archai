const DEFAULT_SIGN_IN_URL = "/sign-in"
const DEFAULT_SIGN_UP_URL = "/sign-up"

function pathnameFromUrl(value: string, fallback: string): string {
  try {
    return new URL(value).pathname || fallback
  } catch {
    return value.startsWith("/") ? value : fallback
  }
}

function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path
}

export const EDITOR_URL = "/editor"
export const SIGN_IN_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? DEFAULT_SIGN_IN_URL
export const SIGN_UP_URL =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? DEFAULT_SIGN_UP_URL
export const SIGN_IN_PATH = normalizePath(
  pathnameFromUrl(SIGN_IN_URL, DEFAULT_SIGN_IN_URL)
)
export const SIGN_UP_PATH = normalizePath(
  pathnameFromUrl(SIGN_UP_URL, DEFAULT_SIGN_UP_URL)
)

export function routePatternForPath(path: string): string {
  return `${path}(.*)`
}
