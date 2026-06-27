import { z } from 'zod'

import {
  HolidaysProviderError,
  type HolidayRecord,
  type HolidaysProvider,
} from './holidays-provider.js'

const holidayRecordSchema = z.object({
  date: z.string(),
  name: z.string(),
  type: z.string().optional(),
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

    let response: Response

    try {
      response = await this.fetchImplementation(requestUrl)
    } catch (error) {
      throw new HolidaysProviderError('Failed to fetch national holidays', { cause: error })
    }

    if (!response.ok) {
      throw new HolidaysProviderError('Failed to fetch national holidays')
    }

    const responseBody: unknown = await response.json()
    const parsedResponse = holidaysResponseSchema.safeParse(responseBody)

    if (!parsedResponse.success) {
      throw new HolidaysProviderError('Failed to parse national holidays response', {
        cause: parsedResponse.error,
      })
    }

    return parsedResponse.data
  }
}
