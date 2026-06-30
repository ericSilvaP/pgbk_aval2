import type { HolidayRecord } from '../providers/holidays-provider.js'

export interface HolidayRepository {
  findByYear(year: number): Promise<HolidayRecord[]>
  saveMany(holidays: HolidayRecord[], year: number): Promise<void>
  getLastSyncDate(year: number): Promise<Date | null>
  updateSyncDate(year: number, date: Date): Promise<void>
}
