export interface HolidayRecord {
  date: string
  name: string
  type: string
  weekday: string
}

export class HolidaysProviderError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'HolidaysProviderError'
  }
}

export interface HolidaysProvider {
  getNationalHolidays(year: number): Promise<HolidayRecord[]>
}
