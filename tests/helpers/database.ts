import { PrismaClient } from '@prisma/client'

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5434/trip_requests_db'

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
})

export async function setupTestDatabase(): Promise<void> {
  await testPrisma.$connect()
}

export async function cleanupTestDatabase(): Promise<void> {
  await testPrisma.tripRequest.deleteMany()
}

export async function disconnectTestDatabase(): Promise<void> {
  await testPrisma.$disconnect()
}

export async function findTripRequestById(id: string) {
  return testPrisma.tripRequest.findUnique({
    where: {
      id,
    },
  })
}

export async function countTripRequests(): Promise<number> {
  return testPrisma.tripRequest.count()
}
