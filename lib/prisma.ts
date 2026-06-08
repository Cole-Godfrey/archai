import { PrismaPg } from "@prisma/adapter-pg"

import { Prisma, PrismaClient } from "@/app/generated/prisma/client"

/**
 * Number of total attempts (1 initial + retries) for a single database
 * operation that fails with a transient *connection* error.
 */
const MAX_DB_ATTEMPTS = 4

/** Base backoff before the first retry; doubles each attempt (250/500/1000ms). */
const DB_RETRY_BASE_DELAY_MS = 250

/** Prisma error codes that mean the database could not be reached at all. */
const TRANSIENT_PRISMA_CODES = new Set(["P1001", "P1002"])

/**
 * Substrings (matched case-insensitively) that identify a transient,
 * *connection-establishment* failure — i.e. the query never executed, so a
 * retry is safe even for writes. The first entry is the message Prisma Postgres
 * returns from its pooler while a paused (idled-out) database wakes back up.
 */
const TRANSIENT_MESSAGE_SIGNATURES = [
  "failed to connect to upstream database",
  "can't reach database server",
  "cannot reach database server",
  "econnrefused",
  "etimedout",
  "enotfound",
  "eai_again",
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Flattens an error and its `cause` chain into one lowercase string to match against. */
function collectErrorMessages(error: unknown): string {
  const messages: string[] = []
  let current: unknown = error

  for (let depth = 0; current !== null && current !== undefined && depth < 5; depth += 1) {
    if (current instanceof Error) {
      messages.push(current.message)
      current = (current as { cause?: unknown }).cause
    } else {
      messages.push(String(current))
      break
    }
  }

  return messages.join(" | ").toLowerCase()
}

/**
 * True only for transient errors raised while *establishing* a connection, so
 * retrying cannot duplicate a write. Covers the Prisma Postgres cold-start
 * (paused database) case plus plain "server unreachable" failures.
 */
function isTransientConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    TRANSIENT_PRISMA_CODES.has(error.code)
  ) {
    return true
  }

  const message = collectErrorMessages(error)

  return TRANSIENT_MESSAGE_SIGNATURES.some((signature) =>
    message.includes(signature)
  )
}

/**
 * Runs a database operation, retrying with exponential backoff when it fails
 * because the database was unreachable. A free-tier Prisma Postgres database
 * auto-pauses after inactivity and returns "Failed to connect to upstream
 * database" on the first request while it wakes; without this, that cold start
 * surfaces as a page crash instead of a brief delay.
 */
async function withConnectionRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_DB_ATTEMPTS; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      lastError = error

      if (attempt >= MAX_DB_ATTEMPTS || !isTransientConnectionError(error)) {
        throw error
      }

      await delay(DB_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    }
  }

  throw lastError
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl === undefined) {
    throw new Error("DATABASE_URL is required to initialize Prisma.")
  }

  const client = databaseUrl.startsWith("prisma+postgres://")
    ? new PrismaClient({ accelerateUrl: databaseUrl })
    : new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

  // Transparently retry every model operation on transient connection failures
  // (e.g. a paused Prisma Postgres database waking on the first request).
  return client.$extends({
    query: {
      $allOperations({ args, query }) {
        return withConnectionRetry(() => query(args))
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient
}

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export { prisma }
