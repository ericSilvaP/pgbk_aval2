import type { GetHolidaysHandler } from '../controllers/get-holidays-controller.js'
import { AppError, createHolidaysApiUnavailableError } from '../errors/app-error.js'
import { HolidaysProviderError, type HolidayRecord, type HolidaysProvider } from '../providers/holidays-provider.js'

export interface GetHolidaysServiceDependencies {
  holidaysProvider: HolidaysProvider
  holidayRepository: {
    getLastSyncDate(year: number): Promise<Date | null>
    findByYear(year: number): Promise<readonly HolidayRecord[]>
    saveMany(records: readonly HolidayRecord[], year: number): Promise<void>
    updateSyncDate(year: number, date: Date): Promise<void>
  }
}

export function createGetHolidaysService(dependencies: GetHolidaysServiceDependencies): GetHolidaysHandler {
  const { holidaysProvider, holidayRepository } = dependencies

  return async (year: number): Promise<readonly HolidayRecord[]> => {
    try {
      const lastSync = await holidayRepository.getLastSyncDate(year)
      const now = new Date()

      const isDefasado = !lastSync || now.getTime() - lastSync.getTime() > 7 * 24 * 60 * 60 * 1000

      if (!isDefasado) {
        return await holidayRepository.findByYear(year)
      }

      const externalHolidays = await holidaysProvider.getNationalHolidays(year)

      await holidayRepository.saveMany(externalHolidays, year)
      await holidayRepository.updateSyncDate(year, now)

      return externalHolidays
    } catch (error) {
      if (error instanceof HolidaysProviderError) {
        throw createHolidaysApiUnavailableError('Holidays API unavailable', {
          cause: error,
        })
      }

      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('INTERNAL_SERVER_ERROR', 'Internal server error', {
        cause: error instanceof Error ? error : new Error(String(error)),
      })
    }
  }
}
