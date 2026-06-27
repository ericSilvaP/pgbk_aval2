import { z } from 'zod'

import {
  HolidaysProviderError,
  type HolidayRecord,
  type HolidaysProvider,
} from './holidays-provider.js'

const HOLIDAYS_API_TIMEOUT_MS = 5000

const holidayRecordSchema = z.object({
  date: z.string(),
  name: z.string(),
  type: z.string(),
})

const holidaysResponseSchema = z.array(holidayRecordSchema)

type FetchImplementation = typeof globalThis.fetch

export interface BrasilApiHolidaysProviderOptions {
  baseUrl: string
  fetchImplementation?: FetchImplementation
}

export class BrasilApiHolidaysProvider implements HolidaysProvider {
  private readonly fetchImplementation: FetchImplementation

  public constructor(private readonly options: BrasilApiHolidaysProviderOptions) {
    this.fetchImplementation = options.fetchImplementation ?? globalThis.fetch
  }

  public async getNationalHolidays(year: number): Promise<HolidayRecord[]> {
    const requestUrl = new URL(`/api/feriados/v1/${String(year)}`, this.options.baseUrl)
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, HOLIDAYS_API_TIMEOUT_MS)

    let response: Response

    try {
      response = await this.fetchImplementation(requestUrl, {
        signal: abortController.signal,
      })
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new HolidaysProviderError('Failed to fetch national holidays', { cause: error })
      }

      throw new HolidaysProviderError('Failed to fetch national holidays', { cause: error })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      throw new HolidaysProviderError('Failed to fetch national holidays')
    }

    let responseBody: unknown

    try {
      responseBody = await response.json()
    } catch (error) {
      throw new HolidaysProviderError('Failed to parse national holidays response', {
        cause: error,
      })
    }

    const parsedResponse = holidaysResponseSchema.safeParse(responseBody)

    if (!parsedResponse.success) {
      throw new HolidaysProviderError('Failed to parse national holidays response', {
        cause: parsedResponse.error,
      })
    }

    return parsedResponse.data.map((holiday) => ({
      date: holiday.date,
      name: holiday.name,
      type: holiday.type,
    }))
  }
}
