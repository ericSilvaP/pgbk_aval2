import type { CreateTripRequestHandler } from '../controllers/create-trip-request-controller.js'
import {
  createHolidayTripNotAllowedError,
  createHolidaysApiUnavailableError,
  createValidationError,
} from '../errors/app-error.js'
import type { HolidaysProvider } from '../providers/holidays-provider.js'
import type { TripRequestRepository } from '../repositories/trip-request-repository.js'
import type { CreateTripRequestInput } from '../validation/trip-request-schemas.js'

export interface CreateTripRequestServiceDependencies {
  tripRequestRepository: TripRequestRepository
  holidaysProvider: HolidaysProvider
}

function normalizeUtcDateTime(value: string, fieldName: 'departureAt' | 'returnAt'): string {
  const normalizedDate = new Date(value)

  if (Number.isNaN(normalizedDate.getTime())) {
    throw createValidationError(`${fieldName} must be a valid date-time`)
  }

  return normalizedDate.toISOString()
}

function validateDateOrdering(departureAt: string, returnAt: string): void {
  if (new Date(returnAt).getTime() < new Date(departureAt).getTime()) {
    throw createValidationError('returnAt must be equal to or later than departureAt')
  }
}

function validatePassengerCount(passengerCount: number): void {
  if (passengerCount <= 0) {
    throw createValidationError('passengerCount must be greater than zero')
  }
}

function extractDepartureCivilDate(departureAt: string): string {
  const [departureCivilDate] = departureAt.split('T')

  if (departureCivilDate === undefined || departureCivilDate.length === 0) {
    throw createValidationError('departureAt must be a valid date-time')
  }

  return departureCivilDate
}

function extractDepartureYear(departureCivilDate: string): number {
  const [yearPart] = departureCivilDate.split('-')

  if (yearPart === undefined || yearPart.length === 0) {
    throw createValidationError('departureAt must be a valid date-time')
  }

  const departureYear = Number(yearPart)

  if (!Number.isInteger(departureYear)) {
    throw createValidationError('departureAt must be a valid date-time')
  }

  return departureYear
}

export function createCreateTripRequestService(
  dependencies: CreateTripRequestServiceDependencies,
): CreateTripRequestHandler {
  const { tripRequestRepository, holidaysProvider } = dependencies

  return async (input: CreateTripRequestInput) => {
    const departureAt = normalizeUtcDateTime(input.departureAt, 'departureAt')
    const returnAt = normalizeUtcDateTime(input.returnAt, 'returnAt')

    validateDateOrdering(departureAt, returnAt)
    validatePassengerCount(input.passengerCount)

    const departureCivilDate = extractDepartureCivilDate(departureAt)
    const departureYear = extractDepartureYear(departureCivilDate)

    let holidays

    try {
      holidays = await holidaysProvider.getNationalHolidays(departureYear)
    } catch (error) {
      throw createHolidaysApiUnavailableError('national holidays are temporarily unavailable', {
        cause: error,
      })
    }

    if (holidays.some((holiday) => holiday.date === departureCivilDate)) {
      throw createHolidayTripNotAllowedError('departureAt cannot fall on a national holiday')
    }

    return tripRequestRepository.create({
      requesterName: input.requesterName,
      origin: input.origin,
      destination: input.destination,
      departureAt,
      returnAt,
      purpose: input.purpose,
      passengerCount: input.passengerCount,
      status: 'pending',
    })
  }
}
