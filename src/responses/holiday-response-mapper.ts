import type { HolidayRecord } from '../providers/holidays-provider.js'

export interface HolidayResponse {
  date: string
  name: string
  type: string
}

export function mapHolidayToResponse(holiday: HolidayRecord): HolidayResponse {
  return {
    date: holiday.date,
    name: holiday.name,
    type: holiday.type,
  }
}

export function mapHolidaysToResponse(holidays: readonly HolidayRecord[]): HolidayResponse[] {
  return holidays.map(mapHolidayToResponse)
}
