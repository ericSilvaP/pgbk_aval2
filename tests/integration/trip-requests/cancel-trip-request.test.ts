import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createApp } from '../../../src/app.js'
import type { HolidaysProvider } from '../../../src/providers/holidays-provider.js'
import { PrismaTripRequestRepository } from '../../../src/repositories/prisma-trip-request-repository.js'
import type { TripRequest, TripRequestRepository } from '../../../src/repositories/trip-request-repository.js'
import {
  cleanupTestDatabase,
  countTripRequests,
  createCanceledTripRequestFixture,
  createPendingTripRequestFixture,
  disconnectTestDatabase,
  expectOnlyTripRequestStatusChanged,
  reloadPersistedTripRequest,
  seedTripRequests,
  setupTestDatabase,
  testPrisma,
} from '../../helpers/database.js'

const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

const cancelTripRequestSuccessEnvelopeSchema = z.object({
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
    status: z.literal('canceled'),
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

const alreadyCanceledEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('TRIP_REQUEST_ALREADY_CANCELED'),
    message: z.literal('Trip request is already canceled'),
  }),
})

const internalErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('INTERNAL_SERVER_ERROR'),
    message: z.literal('Internal server error'),
  }),
})

function createHolidaysProviderDouble() {
  const calls: number[] = []

  const holidaysProvider: HolidaysProvider = {
    async getNationalHolidays(year: number) {
      calls.push(year)
      throw new Error('holidays provider should not be called during cancellation')
    },
  }

  return {
    holidaysProvider,
    calls,
  }
}

function createCancelTripRequestApp(tripRequestRepository: TripRequestRepository) {
  const { holidaysProvider, calls } = createHolidaysProviderDouble()

  return {
    app: createApp({
      tripRequestRepository,
      holidaysProvider,
    }),
    holidaysProviderCalls: calls,
  }
}

describe('PATCH /trip-requests/:id/cancel', () => {
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

  it('returns 200, updates only status to canceled, and keeps the PostgreSQL row persisted', async () => {
    const pendingTripRequest = createPendingTripRequestFixture()

    await seedTripRequests([pendingTripRequest])

    const { app, holidaysProviderCalls } = createCancelTripRequestApp(
      new PrismaTripRequestRepository(testPrisma),
    )

    const response = await request(app).patch(`/trip-requests/${pendingTripRequest.id}/cancel`)
    const responseBody = cancelTripRequestSuccessEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(200)
    expect(responseBody).toStrictEqual({
      success: true,
      data: {
        ...pendingTripRequest,
        status: 'canceled',
      },
    })
    expect(timestampRegex.test(responseBody.data.departureAt)).toBe(true)
    expect(timestampRegex.test(responseBody.data.returnAt)).toBe(true)
    expect(timestampRegex.test(responseBody.data.createdAt)).toBe(true)

    const persistedTripRequest = await reloadPersistedTripRequest(pendingTripRequest.id)

    expect(persistedTripRequest).not.toBeNull()

    if (persistedTripRequest === null) {
      throw new Error('Expected the canceled trip request to remain persisted')
    }

    expectOnlyTripRequestStatusChanged(pendingTripRequest, persistedTripRequest, 'canceled')
    expect(persistedTripRequest).toStrictEqual(responseBody.data)
    expect(await countTripRequests()).toBe(1)
    expect(holidaysProviderCalls).toHaveLength(0)
  })

  it('returns 404 with the standardized error envelope when the trip request does not exist', async () => {
    const { app, holidaysProviderCalls } = createCancelTripRequestApp(
      new PrismaTripRequestRepository(testPrisma),
    )

    const response = await request(app).patch(
      '/trip-requests/33333333-3333-3333-3333-333333333333/cancel',
    )
    const responseBody = notFoundEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(404)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'TRIP_REQUEST_NOT_FOUND',
        message: 'Trip request not found',
      },
    })
    expect(await countTripRequests()).toBe(0)
    expect(holidaysProviderCalls).toHaveLength(0)
  })

  it('returns 409 for an already canceled trip request and does not mutate persisted data', async () => {
    const canceledTripRequest = createCanceledTripRequestFixture()

    await seedTripRequests([canceledTripRequest])

    const persistedTripRequestBeforeRequest = await reloadPersistedTripRequest(canceledTripRequest.id)

    expect(persistedTripRequestBeforeRequest).not.toBeNull()

    const { app, holidaysProviderCalls } = createCancelTripRequestApp(
      new PrismaTripRequestRepository(testPrisma),
    )

    const response = await request(app).patch(`/trip-requests/${canceledTripRequest.id}/cancel`)
    const responseBody = alreadyCanceledEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(409)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'TRIP_REQUEST_ALREADY_CANCELED',
        message: 'Trip request is already canceled',
      },
    })

    const persistedTripRequestAfterRequest = await reloadPersistedTripRequest(canceledTripRequest.id)

    expect(persistedTripRequestAfterRequest).not.toBeNull()

    if (persistedTripRequestBeforeRequest === null || persistedTripRequestAfterRequest === null) {
      throw new Error('Expected the already canceled trip request to remain persisted')
    }

    expectOnlyTripRequestStatusChanged(
      persistedTripRequestBeforeRequest,
      persistedTripRequestAfterRequest,
      'canceled',
    )
    expect(persistedTripRequestAfterRequest).toStrictEqual(canceledTripRequest)
    expect(await countTripRequests()).toBe(1)
    expect(holidaysProviderCalls).toHaveLength(0)
  })

  it('returns 500 with the centralized internal error envelope and no leaked repository details', async () => {
    const pendingTripRequest = createPendingTripRequestFixture({
      id: '44444444-4444-4444-4444-444444444444',
    })
    const findById = vi.fn(async (id: string): Promise<TripRequest | null> => {
      return id === pendingTripRequest.id ? pendingTripRequest : null
    })
    const cancelById = vi.fn(async (_id: string): Promise<TripRequest> => {
      throw new Error(
        'PrismaClientKnownRequestError: SELECT * FROM trip_requests at /home/kaua/Documentos/pgbk_aval2/src/repositories/prisma-trip-request-repository.ts and /home/kaua/Documentos/pgbk_aval2/node_modules/@prisma/client runtime host=localhost port=5432 password=postgres',
      )
    })
    const tripRequestRepository: TripRequestRepository = {
      async create() {
        throw new Error('create should not be called during cancellation')
      },
      async findAll(): Promise<TripRequest[]> {
        throw new Error('findAll should not be called during cancellation')
      },
      findById,
      cancelById,
    }
    const { app, holidaysProviderCalls } = createCancelTripRequestApp(tripRequestRepository)

    const response = await request(app).patch(`/trip-requests/${pendingTripRequest.id}/cancel`)
    const responseBody = internalErrorEnvelopeSchema.parse(response.body)
    const serializedResponseBody = JSON.stringify(response.body)

    expect(response.status).toBe(500)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    })
    expect(serializedResponseBody).not.toContain('stack')
    expect(serializedResponseBody).not.toContain('PrismaClientKnownRequestError')
    expect(serializedResponseBody).not.toContain('SELECT * FROM trip_requests')
    expect(serializedResponseBody).not.toContain('localhost')
    expect(serializedResponseBody).not.toContain('5432')
    expect(serializedResponseBody).not.toContain('password=postgres')
    expect(serializedResponseBody).not.toContain('/home/kaua/Documentos/pgbk_aval2')
    expect(serializedResponseBody).not.toContain('/src/')
    expect(serializedResponseBody).not.toContain('node_modules')
    expect(findById).toHaveBeenCalledTimes(1)
    expect(findById).toHaveBeenCalledWith(pendingTripRequest.id)
    expect(cancelById).toHaveBeenCalledTimes(1)
    expect(cancelById).toHaveBeenCalledWith(pendingTripRequest.id)
    expect(findById.mock.invocationCallOrder[0]).toBeLessThan(
      cancelById.mock.invocationCallOrder[0],
    )
    expect(holidaysProviderCalls).toHaveLength(0)
  })
})
