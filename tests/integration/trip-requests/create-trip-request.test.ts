import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createApp } from '../../../src/app.js'
import type {
  HolidayRecord,
  HolidaysProvider,
  HolidaysProviderError,
} from '../../../src/providers/holidays-provider.js'
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
  findTripRequestsByPurpose,
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
    code: z.enum([
      'VALIDATION_ERROR',
      'HOLIDAY_TRIP_NOT_ALLOWED',
      'HOLIDAYS_API_UNAVAILABLE',
      'INTERNAL_SERVER_ERROR',
    ]),
    message: z.string(),
  }),
})

const requiredFieldCases = [
  'requesterName',
  'origin',
  'destination',
  'departureAt',
  'returnAt',
  'purpose',
  'passengerCount',
] as const

const invalidTypeCases: ReadonlyArray<{
  field: keyof typeof validPayload
  invalidValue: boolean | number | object
}> = [
  { field: 'requesterName', invalidValue: 123 },
  { field: 'origin', invalidValue: 123 },
  { field: 'destination', invalidValue: 123 },
  { field: 'departureAt', invalidValue: 123 },
  { field: 'returnAt', invalidValue: 123 },
  { field: 'purpose', invalidValue: 123 },
  { field: 'passengerCount', invalidValue: 'two' as unknown as object },
]

interface HolidaysProviderDoubleOptions {
  holidays?: HolidayRecord[]
  error?: HolidaysProviderError | Error
}

function createHolidaysProviderDouble(options: HolidaysProviderDoubleOptions = {}) {
  const calls: number[] = []

  const holidaysProvider: HolidaysProvider = {
    async getNationalHolidays(year: number) {
      calls.push(year)

      if (options.error) {
        throw options.error
      }

      return options.holidays ?? []
    },
  }

  return {
    holidaysProvider,
    calls,
  }
}

function createValidationApp() {
  const repositoryCreateCalls: CreateTripRequestRecord[] = []
  const { holidaysProvider, calls } = createHolidaysProviderDouble()
  const tripRequestRepository: TripRequestRepository = {
    async create(input: CreateTripRequestRecord): Promise<TripRequest> {
      repositoryCreateCalls.push(input)
      throw new Error('repository create should not be called')
    },
  }

  return {
    app: createApp({
      tripRequestRepository,
      holidaysProvider,
    }),
    holidaysProviderCalls: calls,
    repositoryCreateCalls,
  }
}

function buildPayloadWithoutField(field: keyof typeof validPayload): Record<string, unknown> {
  switch (field) {
    case 'requesterName':
      return {
        origin: validPayload.origin,
        destination: validPayload.destination,
        departureAt: validPayload.departureAt,
        returnAt: validPayload.returnAt,
        purpose: validPayload.purpose,
        passengerCount: validPayload.passengerCount,
      }
    case 'origin':
      return {
        requesterName: validPayload.requesterName,
        destination: validPayload.destination,
        departureAt: validPayload.departureAt,
        returnAt: validPayload.returnAt,
        purpose: validPayload.purpose,
        passengerCount: validPayload.passengerCount,
      }
    case 'destination':
      return {
        requesterName: validPayload.requesterName,
        origin: validPayload.origin,
        departureAt: validPayload.departureAt,
        returnAt: validPayload.returnAt,
        purpose: validPayload.purpose,
        passengerCount: validPayload.passengerCount,
      }
    case 'departureAt':
      return {
        requesterName: validPayload.requesterName,
        origin: validPayload.origin,
        destination: validPayload.destination,
        returnAt: validPayload.returnAt,
        purpose: validPayload.purpose,
        passengerCount: validPayload.passengerCount,
      }
    case 'returnAt':
      return {
        requesterName: validPayload.requesterName,
        origin: validPayload.origin,
        destination: validPayload.destination,
        departureAt: validPayload.departureAt,
        purpose: validPayload.purpose,
        passengerCount: validPayload.passengerCount,
      }
    case 'purpose':
      return {
        requesterName: validPayload.requesterName,
        origin: validPayload.origin,
        destination: validPayload.destination,
        departureAt: validPayload.departureAt,
        returnAt: validPayload.returnAt,
        passengerCount: validPayload.passengerCount,
      }
    case 'passengerCount':
      return {
        requesterName: validPayload.requesterName,
        origin: validPayload.origin,
        destination: validPayload.destination,
        departureAt: validPayload.departureAt,
        returnAt: validPayload.returnAt,
        purpose: validPayload.purpose,
      }
  }
}

async function expectValidationFailure(
  payload: Record<string, unknown>,
  expectedMessage: string,
): Promise<void> {
  const { app, holidaysProviderCalls, repositoryCreateCalls } = createValidationApp()
  const tripRequestCountBefore = await countTripRequests()

  const response = await request(app).post('/trip-requests').send(payload)
  const responseBody = errorEnvelopeSchema.parse(response.body)

  expect(response.status).toBe(400)
  expect(responseBody).toStrictEqual({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: expectedMessage,
    },
  })
  expect(holidaysProviderCalls).toHaveLength(0)
  expect(repositoryCreateCalls).toHaveLength(0)
  expect(await countTripRequests()).toBe(tripRequestCountBefore)
  expect(await findTripRequestsByPurpose(validPayload.purpose)).toHaveLength(0)
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

  it('creates a trip request, returns 201, persists the PostgreSQL row, and calls the holidays provider once', async () => {
    const { holidaysProvider, calls } = createHolidaysProviderDouble()
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
    expect(calls).toStrictEqual([2026])

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

  it.each(requiredFieldCases)('rejects missing required field %s', async (field) => {
    expect.hasAssertions()
    await expectValidationFailure(buildPayloadWithoutField(field), 'Request body is invalid')
  })

  it.each(invalidTypeCases)(
    'rejects invalid field type for $field',
    async ({ field, invalidValue }) => {
      expect.hasAssertions()
      await expectValidationFailure(
        {
          ...validPayload,
          [field]: invalidValue,
        },
        'Request body is invalid',
      )
    },
  )

  it('rejects invalid departureAt values', async () => {
    expect.hasAssertions()
    await expectValidationFailure(
      {
        ...validPayload,
        departureAt: 'not-a-date',
      },
      'departureAt must be a valid date-time',
    )
  })

  it('rejects invalid returnAt values', async () => {
    expect.hasAssertions()
    await expectValidationFailure(
      {
        ...validPayload,
        returnAt: 'not-a-date',
      },
      'returnAt must be a valid date-time',
    )
  })

  it('accepts requests when returnAt is equal to departureAt', async () => {
    const { holidaysProvider, calls } = createHolidaysProviderDouble()
    const app = createApp({
      tripRequestRepository: new PrismaTripRequestRepository(testPrisma),
      holidaysProvider,
    })

    const response = await request(app)
      .post('/trip-requests')
      .send({
        ...validPayload,
        returnAt: validPayload.departureAt,
      })
    const responseBody = createTripRequestSuccessEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(201)
    expect(responseBody.data.departureAt).toBe('2026-07-10T11:00:00.000Z')
    expect(responseBody.data.returnAt).toBe('2026-07-10T11:00:00.000Z')
    expect(calls).toStrictEqual([2026])
    expect(await countTripRequests()).toBe(1)
  })

  it('rejects requests when returnAt is before departureAt', async () => {
    expect.hasAssertions()
    await expectValidationFailure(
      {
        ...validPayload,
        returnAt: '2026-07-09T18:30:00-03:00',
      },
      'returnAt must be equal to or later than departureAt',
    )
  })

  it('rejects passengerCount equal to zero', async () => {
    expect.hasAssertions()
    await expectValidationFailure(
      {
        ...validPayload,
        passengerCount: 0,
      },
      'passengerCount must be greater than zero',
    )
  })

  it('rejects passengerCount below zero', async () => {
    expect.hasAssertions()
    await expectValidationFailure(
      {
        ...validPayload,
        passengerCount: -1,
      },
      'passengerCount must be greater than zero',
    )
  })

  it('rejects client-managed fields before any provider or repository call', async () => {
    expect.hasAssertions()
    await expectValidationFailure(
      {
        ...validPayload,
        id: 'client-id',
        status: 'pending',
        createdAt: '2026-06-26T15:45:10.123Z',
      },
      'id, status, and createdAt must not be provided',
    )
  })

  it('rejects national holiday departures with HTTP 409 and no persistence', async () => {
    const holidayPurpose = 'Holiday rejection trip'
    let repositoryCreateCalls = 0
    const { holidaysProvider, calls } = createHolidaysProviderDouble({
      holidays: [
        {
          date: '2026-07-10',
          name: 'Test National Holiday',
          type: 'national',
        },
      ],
    })
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
        purpose: holidayPurpose,
      })
    const responseBody = errorEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(409)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'HOLIDAY_TRIP_NOT_ALLOWED',
        message: 'departureAt cannot fall on a national holiday',
      },
    })
    expect(calls).toStrictEqual([2026])
    expect(repositoryCreateCalls).toBe(0)
    expect(await countTripRequests()).toBe(0)
    expect(await findTripRequestsByPurpose(holidayPurpose)).toHaveLength(0)
  })

  it('returns HTTP 502 when the holidays provider fails and does not persist a record', async () => {
    const failurePurpose = 'Provider failure trip'
    let repositoryCreateCalls = 0
    const { holidaysProvider, calls } = createHolidaysProviderDouble({
      error: new Error('provider exploded'),
    })
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
        purpose: failurePurpose,
      })
    const responseBody = errorEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(502)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'HOLIDAYS_API_UNAVAILABLE',
        message: 'national holidays are temporarily unavailable',
      },
    })
    expect(calls).toStrictEqual([2026])
    expect(repositoryCreateCalls).toBe(0)
    expect(await countTripRequests()).toBe(0)
    expect(await findTripRequestsByPurpose(failurePurpose)).toHaveLength(0)
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
