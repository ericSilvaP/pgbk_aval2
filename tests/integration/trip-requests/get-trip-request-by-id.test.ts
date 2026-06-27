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

const tripRequestSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
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
  }),
})

const notFoundEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('TRIP_REQUEST_NOT_FOUND'),
    message: z.literal('Trip request not found'),
  }),
})

const internalErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('INTERNAL_SERVER_ERROR'),
    message: z.literal('An unexpected error occurred'),
  }),
})

const persistedTripRequest: PersistedTripRequestFixture = {
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

function createHolidaysProviderDouble() {
  const calls: number[] = []

  const holidaysProvider: HolidaysProvider = {
    async getNationalHolidays(year: number) {
      calls.push(year)
      throw new Error('holidays provider should not be called during get-by-id retrieval')
    },
  }

  return {
    holidaysProvider,
    calls,
  }
}

function createGetTripRequestByIdApp(tripRequestRepository: TripRequestRepository) {
  const { holidaysProvider, calls } = createHolidaysProviderDouble()

  return {
    app: createApp({
      tripRequestRepository,
      holidaysProvider,
    }),
    holidaysProviderCalls: calls,
  }
}

describe('GET /trip-requests/:id', () => {
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

  it('returns 200 with the matching trip request and UTC date fields when the id exists', async () => {
    await seedTripRequests([persistedTripRequest])

    const { app, holidaysProviderCalls } = createGetTripRequestByIdApp(
      new PrismaTripRequestRepository(testPrisma),
    )

    const response = await request(app).get(`/trip-requests/${persistedTripRequest.id}`)
    const responseBody = tripRequestSuccessEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(200)
    expect(responseBody.success).toBe(true)
    expect(responseBody.data).toStrictEqual({
      id: persistedTripRequest.id,
      requesterName: persistedTripRequest.requesterName,
      origin: persistedTripRequest.origin,
      destination: persistedTripRequest.destination,
      departureAt: persistedTripRequest.departureAt,
      returnAt: persistedTripRequest.returnAt,
      purpose: persistedTripRequest.purpose,
      passengerCount: persistedTripRequest.passengerCount,
      status: persistedTripRequest.status,
      createdAt: persistedTripRequest.createdAt,
    })
    expect(responseBody.data.departureAt.endsWith('Z')).toBe(true)
    expect(responseBody.data.returnAt.endsWith('Z')).toBe(true)
    expect(responseBody.data.createdAt.endsWith('Z')).toBe(true)
    expect(holidaysProviderCalls).toHaveLength(0)
  })

  it('returns 404 with TRIP_REQUEST_NOT_FOUND when the id does not exist', async () => {
    const { app, holidaysProviderCalls } = createGetTripRequestByIdApp(
      new PrismaTripRequestRepository(testPrisma),
    )

    const response = await request(app).get('/trip-requests/33333333-3333-3333-3333-333333333333')
    const responseBody = notFoundEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(404)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'TRIP_REQUEST_NOT_FOUND',
        message: 'Trip request not found',
      },
    })
    expect(holidaysProviderCalls).toHaveLength(0)
  })

  it('returns INTERNAL_SERVER_ERROR without leaking repository details when get-by-id fails unexpectedly', async () => {
    const tripRequestRepository: TripRequestRepository = {
      async create() {
        throw new Error('create should not be called during get-by-id retrieval')
      },
      async findAll(): Promise<TripRequest[]> {
        throw new Error('findAll should not be called during get-by-id retrieval')
      },
      async findById() {
        throw new Error('database connection lost')
      },
    }
    const { app, holidaysProviderCalls } = createGetTripRequestByIdApp(tripRequestRepository)

    const response = await request(app).get(`/trip-requests/${persistedTripRequest.id}`)
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
    expect(JSON.stringify(response.body)).not.toContain('stack')
    expect(holidaysProviderCalls).toHaveLength(0)
  })
})
