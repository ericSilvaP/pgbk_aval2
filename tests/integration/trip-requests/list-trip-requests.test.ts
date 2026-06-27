import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createApp } from '../../../src/app.js'
import type { HolidaysProvider } from '../../../src/providers/holidays-provider.js'
import { PrismaTripRequestRepository } from '../../../src/repositories/prisma-trip-request-repository.js'
import type { TripRequest, TripRequestRepository } from '../../../src/repositories/trip-request-repository.js'
import {
  cleanupTestDatabase,
  disconnectTestDatabase,
  seedTripRequests,
  setupTestDatabase,
  testPrisma,
  type PersistedTripRequestFixture,
} from '../../helpers/database.js'

const tripRequestResponseSchema = z.object({
  id: z.string(),
  requesterName: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureAt: z.string(),
  returnAt: z.string(),
  purpose: z.string(),
  passengerCount: z.number(),
  status: z.enum(['pending', 'canceled']),
  createdAt: z.string(),
})

const listTripRequestsSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(tripRequestResponseSchema),
})

const internalErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('INTERNAL_SERVER_ERROR'),
    message: z.literal('An unexpected error occurred'),
  }),
})

const persistedTripRequests: ReadonlyArray<PersistedTripRequestFixture> = [
  {
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
  },
  {
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
  },
]

function createHolidaysProviderDouble() {
  const calls: number[] = []

  const holidaysProvider: HolidaysProvider = {
    async getNationalHolidays(year: number) {
      calls.push(year)
      throw new Error('holidays provider should not be called during list retrieval')
    },
  }

  return {
    holidaysProvider,
    calls,
  }
}

function createListTripRequestsApp(tripRequestRepository: TripRequestRepository) {
  const { holidaysProvider, calls } = createHolidaysProviderDouble()

  return {
    app: createApp({
      tripRequestRepository,
      holidaysProvider,
    }),
    holidaysProviderCalls: calls,
  }
}

describe('GET /trip-requests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
    await disconnectTestDatabase()
  })

  it('returns 200 with an empty array when no trip requests exist', async () => {
    const { app, holidaysProviderCalls } = createListTripRequestsApp(
      new PrismaTripRequestRepository(testPrisma),
    )

    const response = await request(app).get('/trip-requests')
    const responseBody = listTripRequestsSuccessEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(200)
    expect(responseBody).toStrictEqual({
      success: true,
      data: [],
    })
    expect(holidaysProviderCalls).toHaveLength(0)
  })

  it('returns persisted trip requests with canonical UTC fields using order-insensitive assertions', async () => {
    await seedTripRequests(persistedTripRequests)

    const { app, holidaysProviderCalls } = createListTripRequestsApp(
      new PrismaTripRequestRepository(testPrisma),
    )

    const response = await request(app).get('/trip-requests')
    const responseBody = listTripRequestsSuccessEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(200)
    expect(responseBody.success).toBe(true)
    expect(responseBody.data).toHaveLength(persistedTripRequests.length)
    expect(responseBody.data).toStrictEqual(
      expect.arrayContaining(
        persistedTripRequests.map((tripRequest) => ({
          id: tripRequest.id,
          requesterName: tripRequest.requesterName,
          origin: tripRequest.origin,
          destination: tripRequest.destination,
          departureAt: tripRequest.departureAt,
          returnAt: tripRequest.returnAt,
          purpose: tripRequest.purpose,
          passengerCount: tripRequest.passengerCount,
          status: tripRequest.status,
          createdAt: tripRequest.createdAt,
        })),
      ),
    )
    expect(holidaysProviderCalls).toHaveLength(0)
  })

  it('returns INTERNAL_SERVER_ERROR without leaking repository details when listing fails unexpectedly', async () => {
    const tripRequestRepository: TripRequestRepository = {
      async create() {
        throw new Error('create should not be called during list retrieval')
      },
      async findAll(): Promise<TripRequest[]> {
        throw new Error('database connection lost')
      },
      async findById() {
        throw new Error('findById should not be called during list retrieval')
      },
      async cancelById(): Promise<TripRequest> {
        throw new Error('cancelById should not be called during list retrieval')
      },
    }
    const { app, holidaysProviderCalls } = createListTripRequestsApp(tripRequestRepository)

    const response = await request(app).get('/trip-requests')
    const responseBody = internalErrorEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(500)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    })
    expect(JSON.stringify(response.body)).not.toContain('database connection lost')
    expect(holidaysProviderCalls).toHaveLength(0)
  })
})
