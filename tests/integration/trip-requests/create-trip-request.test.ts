import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createApp } from '../../../src/app.js'
import type { HolidaysProvider } from '../../../src/providers/holidays-provider.js'
import { PrismaTripRequestRepository } from '../../../src/repositories/prisma-trip-request-repository.js'
import type {
  CreateTripRequestRecord,
  TripRequest,
  TripRequestRepository,
} from '../../../src/repositories/trip-request-repository.js'
import {
  cleanupTestDatabase,
  countTripRequests,
  disconnectTestDatabase,
  findTripRequestById,
  setupTestDatabase,
  testPrisma,
} from '../../helpers/database.js'

const validPayload = {
  requesterName: 'Maria Silva',
  origin: 'Fortaleza',
  destination: 'Recife',
  departureAt: '2026-07-10T08:00:00-03:00',
  returnAt: '2026-07-12T18:30:00-03:00',
  purpose: 'Institutional meeting',
  passengerCount: 2,
}

const createTripRequestSuccessEnvelopeSchema = z.object({
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
    status: z.literal('pending'),
    createdAt: z.string(),
  }),
})

const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

function createHolidaysProviderDouble() {
  const calls: number[] = []

  const holidaysProvider: HolidaysProvider = {
    async getNationalHolidays(year: number) {
      calls.push(year)
      return []
    },
  }

  return {
    holidaysProvider,
    calls,
  }
}

describe('POST /trip-requests', () => {
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

  it('creates a trip request, returns 201, and persists the PostgreSQL row', async () => {
    const { holidaysProvider } = createHolidaysProviderDouble()
    const app = createApp({
      tripRequestRepository: new PrismaTripRequestRepository(testPrisma),
      holidaysProvider,
    })

    const response = await request(app).post('/trip-requests').send(validPayload)
    const responseBody = createTripRequestSuccessEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(201)
    expect(responseBody.success).toBe(true)
    expect(typeof responseBody.data.id).toBe('string')
    expect(responseBody.data.requesterName).toBe(validPayload.requesterName)
    expect(responseBody.data.origin).toBe(validPayload.origin)
    expect(responseBody.data.destination).toBe(validPayload.destination)
    expect(responseBody.data.departureAt).toBe('2026-07-10T11:00:00.000Z')
    expect(responseBody.data.returnAt).toBe('2026-07-12T21:30:00.000Z')
    expect(responseBody.data.purpose).toBe(validPayload.purpose)
    expect(responseBody.data.passengerCount).toBe(validPayload.passengerCount)
    expect(responseBody.data.status).toBe('pending')
    expect(typeof responseBody.data.createdAt).toBe('string')

    const persistedTripRequest = await findTripRequestById(responseBody.data.id)

    expect(persistedTripRequest).not.toBeNull()
    expect(persistedTripRequest).toMatchObject({
      id: responseBody.data.id,
      requesterName: validPayload.requesterName,
      origin: validPayload.origin,
      destination: validPayload.destination,
      purpose: validPayload.purpose,
      passengerCount: validPayload.passengerCount,
      status: 'pending',
    })
    expect(persistedTripRequest?.departureAt.toISOString()).toBe('2026-07-10T11:00:00.000Z')
    expect(persistedTripRequest?.returnAt.toISOString()).toBe('2026-07-12T21:30:00.000Z')
    expect(persistedTripRequest?.createdAt.toISOString()).toBe(responseBody.data.createdAt)
    expect(await countTripRequests()).toBe(1)
  })

  it('rejects client-managed fields before any provider or repository call', async () => {
    let repositoryCreateCalls = 0
    const { holidaysProvider, calls } = createHolidaysProviderDouble()
    const tripRequestRepository: TripRequestRepository = {
      async create(_input: CreateTripRequestRecord): Promise<TripRequest> {
        repositoryCreateCalls += 1
        throw new Error('repository create should not be called')
      },
    }
    const app = createApp({
      tripRequestRepository,
      holidaysProvider,
    })

    const response = await request(app)
      .post('/trip-requests')
      .send({
        ...validPayload,
        id: 'client-id',
        status: 'pending',
        createdAt: '2026-06-26T15:45:10.123Z',
      })
    const responseBody = errorEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(400)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'id, status, and createdAt must not be provided',
      },
    })
    expect(calls).toHaveLength(0)
    expect(repositoryCreateCalls).toBe(0)
    expect(await countTripRequests()).toBe(0)
  })

  it('returns the standardized 500 envelope when the repository throws', async () => {
    let repositoryCreateCalls = 0
    const { holidaysProvider } = createHolidaysProviderDouble()
    const tripRequestRepository: TripRequestRepository = {
      async create(_input: CreateTripRequestRecord): Promise<TripRequest> {
        repositoryCreateCalls += 1
        throw new Error('database exploded')
      },
    }
    const app = createApp({
      tripRequestRepository,
      holidaysProvider,
    })

    const response = await request(app).post('/trip-requests').send(validPayload)
    const responseBody = errorEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(500)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    })
    expect(JSON.stringify(responseBody)).not.toContain('database exploded')
    expect(repositoryCreateCalls).toBe(1)
    expect(await countTripRequests()).toBe(0)
  })
})
