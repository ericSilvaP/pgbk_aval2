import { open, unlink } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

import { PrismaClient } from '@prisma/client'
import { afterEach } from 'vitest'

import type { TripRequest } from '../../src/repositories/trip-request-repository.js'

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5434/trip_requests_db'
const TEST_DATABASE_LOCK_PATH = '/tmp/pgbk_aval2-test-database.lock'

export interface PersistedTripRequestFixture {
  id: string
  requesterName: string
  origin: string
  destination: string
  departureAt: string
  returnAt: string
  purpose: string
  passengerCount: number
  status: TripRequest['status']
  createdAt: string
}

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
})

let testDatabaseLockHandle: Awaited<ReturnType<typeof open>> | null = null

async function acquireTestDatabaseLock(): Promise<void> {
  if (testDatabaseLockHandle !== null) {
    return
  }

  for (;;) {
    try {
      testDatabaseLockHandle = await open(TEST_DATABASE_LOCK_PATH, 'wx')
      return
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
        await delay(10)
        continue
      }

      throw error
    }
  }
}

async function releaseTestDatabaseLock(): Promise<void> {
  if (testDatabaseLockHandle === null) {
    return
  }

  await testDatabaseLockHandle.close()
  testDatabaseLockHandle = null
  await unlink(TEST_DATABASE_LOCK_PATH).catch((error: unknown) => {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return
    }

    throw error
  })
}

afterEach(async () => {
  await releaseTestDatabaseLock()
})

export async function setupTestDatabase(): Promise<void> {
  await testPrisma.$connect()
}

export async function cleanupTestDatabase(): Promise<void> {
  await acquireTestDatabaseLock()
  await testPrisma.tripRequest.deleteMany()
}

export async function disconnectTestDatabase(): Promise<void> {
  await releaseTestDatabaseLock()
  await testPrisma.$disconnect()
}

export async function seedTripRequests(fixtures: ReadonlyArray<PersistedTripRequestFixture>): Promise<void> {
  if (fixtures.length === 0) {
    return
  }

  await testPrisma.tripRequest.createMany({
    data: fixtures.map((fixture) => ({
      id: fixture.id,
      requesterName: fixture.requesterName,
      origin: fixture.origin,
      destination: fixture.destination,
      departureAt: new Date(fixture.departureAt),
      returnAt: new Date(fixture.returnAt),
      purpose: fixture.purpose,
      passengerCount: fixture.passengerCount,
      status: fixture.status,
      createdAt: new Date(fixture.createdAt),
    })),
  })
}

export async function findTripRequestById(id: string) {
  return testPrisma.tripRequest.findUnique({
    where: {
      id,
    },
  })
}

export async function findTripRequestsByPurpose(purpose: string) {
  return testPrisma.tripRequest.findMany({
    where: {
      purpose,
    },
  })
}

export async function countTripRequests(): Promise<number> {
  return testPrisma.tripRequest.count()
}
