import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createApp } from '../../../src/app.js'
import { BrasilApiHolidaysProvider } from '../../../src/providers/brasil-api-holidays-provider.js'
import type { HolidayRecord, HolidaysProvider } from '../../../src/providers/holidays-provider.js'
import type {
  CreateTripRequestRecord,
  TripRequest,
  TripRequestRepository,
} from '../../../src/repositories/trip-request-repository.js'

const holidayResponseSchema = z.object({
  date: z.string(),
  name: z.string(),
  type: z.string(),
})

const getHolidaysSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(holidayResponseSchema),
})

const validationErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('VALIDATION_ERROR'),
    message: z.literal('year must be a four-digit number between 1000 and 9999'),
  }),
})

const holidaysApiUnavailableEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('HOLIDAYS_API_UNAVAILABLE'),
    message: z.literal('Holidays API unavailable'),
  }),
})

const internalServerErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('INTERNAL_SERVER_ERROR'),
    message: z.literal('Internal server error'),
  }),
})

const invalidYearCases = ['0000', '0999', '10000', 'abcd', '20a5', '25', '202'] as const
const holidaysApiBaseUrl = 'https://brasilapi.example'
const expectedUpstreamUrl = `${holidaysApiBaseUrl}/api/feriados/v1/2025`

type FetchInput = Parameters<typeof globalThis.fetch>[0]
type FetchInit = Parameters<typeof globalThis.fetch>[1]

interface TripRequestRepositoryDouble {
  tripRequestRepository: TripRequestRepository
  createSpy: ReturnType<typeof vi.fn>
  findAllSpy: ReturnType<typeof vi.fn>
  findByIdSpy: ReturnType<typeof vi.fn>
  cancelByIdSpy: ReturnType<typeof vi.fn>
}

interface HolidaysProviderDoubleOptions {
  holidays?: ReadonlyArray<HolidayRecord>
  error?: Error
}

function createTripRequestRepositoryDouble(): TripRequestRepositoryDouble {
  const createSpy = vi.fn(async (_input: CreateTripRequestRecord): Promise<TripRequest> => {
    throw new Error('trip-request create should not be called during holidays retrieval')
  })
  const findAllSpy = vi.fn(async (): Promise<TripRequest[]> => {
    throw new Error('trip-request findAll should not be called during holidays retrieval')
  })
  const findByIdSpy = vi.fn(async (_id: string): Promise<TripRequest | null> => {
    throw new Error('trip-request findById should not be called during holidays retrieval')
  })
  const cancelByIdSpy = vi.fn(async (_id: string): Promise<TripRequest> => {
    throw new Error('trip-request cancelById should not be called during holidays retrieval')
  })

  return {
    tripRequestRepository: {
      create: createSpy,
      findAll: findAllSpy,
      findById: findByIdSpy,
      cancelById: cancelByIdSpy,
    },
    createSpy,
    findAllSpy,
    findByIdSpy,
    cancelByIdSpy,
  }
}

function createHolidaysProviderDouble(
  options: HolidaysProviderDoubleOptions = {},
): {
  holidaysProvider: HolidaysProvider
  getNationalHolidaysSpy: ReturnType<typeof vi.fn>
} {
  const getNationalHolidaysSpy = vi.fn(async (_year: number): Promise<HolidayRecord[]> => {
    if (options.error instanceof Error) {
      throw options.error
    }

    return [...(options.holidays ?? [])]
  })

  return {
    holidaysProvider: {
      getNationalHolidays: getNationalHolidaysSpy,
    },
    getNationalHolidaysSpy,
  }
}

function createHolidaysApp(holidaysProvider: HolidaysProvider) {
  const repositoryDouble = createTripRequestRepositoryDouble()

  return {
    app: createApp({
      tripRequestRepository: repositoryDouble.tripRequestRepository,
      holidaysProvider,
    }),
    repositoryDouble,
  }
}

function expectNoTripRequestRepositoryCalls(repositoryDouble: TripRequestRepositoryDouble): void {
  expect(repositoryDouble.createSpy).not.toHaveBeenCalled()
  expect(repositoryDouble.findAllSpy).not.toHaveBeenCalled()
  expect(repositoryDouble.findByIdSpy).not.toHaveBeenCalled()
  expect(repositoryDouble.cancelByIdSpy).not.toHaveBeenCalled()
}

function getFetchInputUrl(input: FetchInput): string {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  return input.url
}

describe('GET /holidays/:year', () => {
  it('returns 200 with the standardized success envelope and strips unknown upstream fields', async () => {
    const providerHolidays: ReadonlyArray<HolidayRecord> = [
      {
        date: '2025-01-01',
        name: 'Confraternizacao Universal',
        type: 'national',
        description: 'ignored by response mapper',
      } as HolidayRecord,
      {
        date: '2025-04-21',
        name: 'Tiradentes',
        type: 'national',
        source: 'BrasilAPI',
      } as HolidayRecord,
    ]
    const { holidaysProvider, getNationalHolidaysSpy } = createHolidaysProviderDouble({
      holidays: providerHolidays,
    })
    const { app, repositoryDouble } = createHolidaysApp(holidaysProvider)

    const response = await request(app).get('/holidays/2025')
    const responseBody = getHolidaysSuccessEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(200)
    expect(responseBody).toStrictEqual({
      success: true,
      data: [
        {
          date: '2025-01-01',
          name: 'Confraternizacao Universal',
          type: 'national',
        },
        {
          date: '2025-04-21',
          name: 'Tiradentes',
          type: 'national',
        },
      ],
    })

    for (const holiday of responseBody.data) {
      expect(Object.keys(holiday)).toStrictEqual(['date', 'name', 'type'])
    }

    expect(getNationalHolidaysSpy).toHaveBeenCalledTimes(1)
    expect(getNationalHolidaysSpy).toHaveBeenCalledWith(2025)
    expectNoTripRequestRepositoryCalls(repositoryDouble)
  })

  it('returns 200 with an empty data array when the provider returns no holidays', async () => {
    const { holidaysProvider, getNationalHolidaysSpy } = createHolidaysProviderDouble({
      holidays: [],
    })
    const { app, repositoryDouble } = createHolidaysApp(holidaysProvider)

    const response = await request(app).get('/holidays/2025')
    const responseBody = getHolidaysSuccessEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(200)
    expect(responseBody).toStrictEqual({
      success: true,
      data: [],
    })
    expect(getNationalHolidaysSpy).toHaveBeenCalledTimes(1)
    expect(getNationalHolidaysSpy).toHaveBeenCalledWith(2025)
    expectNoTripRequestRepositoryCalls(repositoryDouble)
  })

  it.each(invalidYearCases)(
    'returns 400 with VALIDATION_ERROR and does not call the provider for invalid year %s',
    async (invalidYear) => {
      const { holidaysProvider, getNationalHolidaysSpy } = createHolidaysProviderDouble({
        holidays: [
          {
            date: '2025-01-01',
            name: 'Confraternizacao Universal',
            type: 'national',
          },
        ],
      })
      const { app, repositoryDouble } = createHolidaysApp(holidaysProvider)

      const response = await request(app).get(`/holidays/${invalidYear}`)
      const responseBody = validationErrorEnvelopeSchema.parse(response.body)

      expect(response.status).toBe(400)
      expect(responseBody).toStrictEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'year must be a four-digit number between 1000 and 9999',
        },
      })
      expect(getNationalHolidaysSpy).not.toHaveBeenCalled()
      expectNoTripRequestRepositoryCalls(repositoryDouble)
    },
  )

  it('returns 502 with HOLIDAYS_API_UNAVAILABLE when the upstream provider responds with a non-success status', async () => {
    const fetchSpy = vi.fn(
      async (input: FetchInput, _init?: FetchInit): Promise<Response> => {
        expect(getFetchInputUrl(input)).toBe(expectedUpstreamUrl)

        return new Response(null, {
          status: 503,
        })
      },
    )
    const holidaysProvider = new BrasilApiHolidaysProvider({
      baseUrl: holidaysApiBaseUrl,
      fetchImplementation: fetchSpy,
    })
    const { app, repositoryDouble } = createHolidaysApp(holidaysProvider)

    const response = await request(app).get('/holidays/2025')
    const responseBody = holidaysApiUnavailableEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(502)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'HOLIDAYS_API_UNAVAILABLE',
        message: 'Holidays API unavailable',
      },
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expectNoTripRequestRepositoryCalls(repositoryDouble)
  })

  it('returns 502 with HOLIDAYS_API_UNAVAILABLE when the upstream provider payload is invalid', async () => {
    const fetchSpy = vi.fn(
      async (input: FetchInput, _init?: FetchInit): Promise<Response> => {
        expect(getFetchInputUrl(input)).toBe(expectedUpstreamUrl)

        return new Response(
          JSON.stringify([
            {
              date: '2025-01-01',
              name: 'Confraternizacao Universal',
            },
          ]),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        )
      },
    )
    const holidaysProvider = new BrasilApiHolidaysProvider({
      baseUrl: holidaysApiBaseUrl,
      fetchImplementation: fetchSpy,
    })
    const { app, repositoryDouble } = createHolidaysApp(holidaysProvider)

    const response = await request(app).get('/holidays/2025')
    const responseBody = holidaysApiUnavailableEnvelopeSchema.parse(response.body)

    expect(response.status).toBe(502)
    expect(responseBody).toStrictEqual({
      success: false,
      error: {
        code: 'HOLIDAYS_API_UNAVAILABLE',
        message: 'Holidays API unavailable',
      },
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expectNoTripRequestRepositoryCalls(repositoryDouble)
  })

  it(
    'returns 502 with HOLIDAYS_API_UNAVAILABLE when the upstream request times out after 5000 ms',
    async () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
      const fetchSpy = vi.fn((input: FetchInput, init?: FetchInit): Promise<Response> => {
        expect(getFetchInputUrl(input)).toBe(expectedUpstreamUrl)
        expect(init?.signal).toBeDefined()

        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              reject(new DOMException('The operation was aborted', 'AbortError'))
            },
            { once: true },
          )
        })
      })
      const holidaysProvider = new BrasilApiHolidaysProvider({
        baseUrl: holidaysApiBaseUrl,
        fetchImplementation: fetchSpy,
      })
      const { app, repositoryDouble } = createHolidaysApp(holidaysProvider)

      try {
        const response = await request(app).get('/holidays/2025')
        const responseBody = holidaysApiUnavailableEnvelopeSchema.parse(response.body)
        const firstFetchCall = fetchSpy.mock.calls[0]
        const requestInit = firstFetchCall?.[1]

        expect(response.status).toBe(502)
        expect(responseBody).toStrictEqual({
          success: false,
          error: {
            code: 'HOLIDAYS_API_UNAVAILABLE',
            message: 'Holidays API unavailable',
          },
        })
        expect(fetchSpy).toHaveBeenCalledTimes(1)
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000)
        expect(requestInit?.signal).toBeDefined()
        expect(requestInit?.signal?.aborted).toBe(true)
        expectNoTripRequestRepositoryCalls(repositoryDouble)
      } finally {
        setTimeoutSpy.mockRestore()
      }
    },
    10000,
  )

  it('returns 500 with the standardized internal error envelope and no leaked internal details for unexpected failures', async () => {
    const unexpectedFailure = new Error(
      'stack trace from /home/kaua/Documentos/pgbk_aval2/src/services/get-holidays-service.ts node_modules prisma connection ECONNREFUSED SELECT * FROM trip_requests host=localhost port=5432',
    )
    const { holidaysProvider, getNationalHolidaysSpy } = createHolidaysProviderDouble({
      error: unexpectedFailure,
    })
    const { app, repositoryDouble } = createHolidaysApp(holidaysProvider)

    const response = await request(app).get('/holidays/2025')
    const responseBody = internalServerErrorEnvelopeSchema.parse(response.body)
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
    expect(serializedResponseBody).not.toContain('/home/kaua/Documentos/pgbk_aval2')
    expect(serializedResponseBody).not.toContain('/src/')
    expect(serializedResponseBody).not.toContain('node_modules')
    expect(serializedResponseBody).not.toContain('SELECT * FROM trip_requests')
    expect(serializedResponseBody).not.toContain('localhost')
    expect(serializedResponseBody).not.toContain('5432')
    expect(serializedResponseBody).not.toContain('ECONNREFUSED')
    expect(serializedResponseBody).not.toContain('prisma')
    expect(getNationalHolidaysSpy).toHaveBeenCalledTimes(1)
    expect(getNationalHolidaysSpy).toHaveBeenCalledWith(2025)
    expectNoTripRequestRepositoryCalls(repositoryDouble)
  })
})
