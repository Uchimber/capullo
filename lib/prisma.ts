import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// we use a separate key to avoid Prisma auto-detecting helpfully-but-wrongly
const connectionString = (process.env.POSTGRES_URL || process.env.DATABASE_URL) as string

if (!connectionString) {
  console.error('DATABASE_URL or POSTGRES_URL is missing! Please check your environment variables.')
}

const pool = new pg.Pool({ 
  connectionString,
  ssl: connectionString?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
})
const adapter = new PrismaPg(pool)

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
