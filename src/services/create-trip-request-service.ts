import type { CreateTripRequestHandler } from '../controllers/create-trip-request-controller.js'
import type { HolidaysProvider } from '../providers/holidays-provider.js'
import type { TripRequestRepository } from '../repositories/trip-request-repository.js'
import type { CreateTripRequestInput } from '../validation/trip-request-schemas.js'

export interface CreateTripRequestServiceDependencies {
  tripRequestRepository: TripRequestRepository
  holidaysProvider: HolidaysProvider
}

function normalizeUtcDateTime(value: string): string {
  return new Date(value).toISOString()
}

export function createCreateTripRequestService(
  dependencies: CreateTripRequestServiceDependencies,
): CreateTripRequestHandler {
  const { tripRequestRepository, holidaysProvider: _holidaysProvider } = dependencies

  return async (input: CreateTripRequestInput) => {
    return tripRequestRepository.create({
      requesterName: input.requesterName,
      origin: input.origin,
      destination: input.destination,
      departureAt: normalizeUtcDateTime(input.departureAt),
      returnAt: normalizeUtcDateTime(input.returnAt),
      purpose: input.purpose,
      passengerCount: input.passengerCount,
      status: 'pending',
    })
  }
}
