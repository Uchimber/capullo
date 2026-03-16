import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// we use a separate key to avoid Prisma auto-detecting helpfully-but-wrongly
const connectionString = (process.env.POSTGRES_URL || process.env.DATABASE_URL) as string

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_URL is missing! Please check your environment variables.')
}

function resolveSslConfig(urlString: string): pg.PoolConfig['ssl'] | undefined {
  try {
    const parsed = new URL(urlString)
    const host = parsed.hostname.toLowerCase()
    const sslmode = parsed.searchParams.get('sslmode')?.toLowerCase()
    const ssl = parsed.searchParams.get('ssl')?.toLowerCase()

    const isLocalhost =
      host === 'localhost' || host === '127.0.0.1' || host === '::1'

    const explicitlyDisableSsl =
      sslmode === 'disable' || ssl === 'false' || ssl === '0'
    const explicitlyEnableSsl =
      sslmode === 'require' ||
      sslmode === 'verify-ca' ||
      sslmode === 'verify-full' ||
      ssl === 'true' ||
      ssl === '1'

    if (explicitlyDisableSsl || isLocalhost) return false
    if (explicitlyEnableSsl) return { rejectUnauthorized: false }

    // Let node-postgres decide when not explicitly set in URL.
    return undefined
  } catch {
    return undefined
  }
}

const pool = new pg.Pool({
  connectionString,
  ssl: resolveSslConfig(connectionString),
})
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
