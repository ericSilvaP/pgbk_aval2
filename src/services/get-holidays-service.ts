import type { GetHolidaysHandler } from '../controllers/get-holidays-controller.js'
import { createHolidaysApiUnavailableError } from '../errors/app-error.js'
import {
  HolidaysProviderError,
  type HolidayRecord,
  type HolidaysProvider,
} from '../providers/holidays-provider.js'

export interface GetHolidaysServiceDependencies {
  holidaysProvider: HolidaysProvider
}

export function createGetHolidaysService(
  dependencies: GetHolidaysServiceDependencies,
): GetHolidaysHandler {
  const { holidaysProvider } = dependencies

  return async (year: number): Promise<readonly HolidayRecord[]> => {
    try {
      return await holidaysProvider.getNationalHolidays(year)
    } catch (error) {
      if (error instanceof HolidaysProviderError) {
        throw createHolidaysApiUnavailableError('Holidays API unavailable', {
          cause: error,
        })
      }

      throw error
    }
  }
}
