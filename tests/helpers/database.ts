import { open, unlink } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

import { PrismaClient } from '@prisma/client'
import { afterEach, expect } from 'vitest'

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

const DEFAULT_PENDING_TRIP_REQUEST_FIXTURE: PersistedTripRequestFixture = {
  id: '11111111-1111-1111-1111-111111111111',
  requesterName: 'Maria Silva',
  origin: 'Fortaleza',
  destination: 'Recife',
  departureAt: '2026-07-10T11:00:00.000Z',
  returnAt: '2026-07-12T21:30:00.000Z',
  purpose: 'Institutional meeting',
  passengerCount: 2,
  status: 'pending',
  createdAt: '2026-06-26T15:45:10.123Z',
}

const DEFAULT_CANCELED_TRIP_REQUEST_FIXTURE: PersistedTripRequestFixture = {
  id: '22222222-2222-2222-2222-222222222222',
  requesterName: 'Joao Costa',
  origin: 'Sobral',
  destination: 'Natal',
  departureAt: '2026-08-03T13:00:00.000Z',
  returnAt: '2026-08-05T18:00:00.000Z',
  purpose: 'Technical visit',
  passengerCount: 3,
  status: 'canceled',
  createdAt: '2026-06-27T09:00:00.000Z',
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

export function createPendingTripRequestFixture(
  overrides: Partial<PersistedTripRequestFixture> = {},
): PersistedTripRequestFixture {
  return {
    ...DEFAULT_PENDING_TRIP_REQUEST_FIXTURE,
    ...overrides,
    status: 'pending',
  }
}

export function createCanceledTripRequestFixture(
  overrides: Partial<PersistedTripRequestFixture> = {},
): PersistedTripRequestFixture {
  return {
    ...DEFAULT_CANCELED_TRIP_REQUEST_FIXTURE,
    ...overrides,
    status: 'canceled',
  }
}

function mapPersistedTripRequestRecord(record: NonNullable<Awaited<ReturnType<typeof findTripRequestById>>>) {
  return {
    id: record.id,
    requesterName: record.requesterName,
    origin: record.origin,
    destination: record.destination,
    departureAt: record.departureAt.toISOString(),
    returnAt: record.returnAt.toISOString(),
    purpose: record.purpose,
    passengerCount: record.passengerCount,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
  } satisfies PersistedTripRequestFixture
}

export async function findTripRequestById(id: string) {
  return testPrisma.tripRequest.findUnique({
    where: {
      id,
    },
  })
}

export async function reloadPersistedTripRequest(
  id: string,
): Promise<PersistedTripRequestFixture | null> {
  const tripRequest = await findTripRequestById(id)

  if (tripRequest === null) {
    return null
  }

  return mapPersistedTripRequestRecord(tripRequest)
}

export function expectOnlyTripRequestStatusChanged(
  before: PersistedTripRequestFixture,
  after: PersistedTripRequestFixture,
  expectedStatus: TripRequest['status'],
): void {
  expect(after).toStrictEqual({
    ...before,
    status: expectedStatus,
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
