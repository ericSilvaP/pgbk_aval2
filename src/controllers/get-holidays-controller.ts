import type { RequestHandler } from 'express'

import type { HolidayRecord } from '../providers/holidays-provider.js'
import { mapHolidaysToResponse } from '../responses/holiday-response-mapper.js'
import { sendSuccessResponse } from '../responses/send-success-response.js'
import { parseHolidayYearParam } from '../validation/holiday-schemas.js'

export type GetHolidaysHandler = (year: number) => Promise<readonly HolidayRecord[]>

export interface GetHolidaysControllerDependencies {
  getHolidays: GetHolidaysHandler
}

export function createGetHolidaysController(
  dependencies: GetHolidaysControllerDependencies,
): RequestHandler {
  return (request, response, next) => {
    void (async () => {
      const year = parseHolidayYearParam(request.params.year)
      const holidays = await dependencies.getHolidays(year)

      sendSuccessResponse(response, mapHolidaysToResponse(holidays))
    })().catch(next)
  }
}
