import type { ListTripRequestsHandler } from '../controllers/list-trip-requests-controller.js'
import type { TripRequestRepository } from '../repositories/trip-request-repository.js'

export interface ListTripRequestsServiceDependencies {
  tripRequestRepository: TripRequestRepository
}

export function createListTripRequestsService(
  dependencies: ListTripRequestsServiceDependencies,
): ListTripRequestsHandler {
  const { tripRequestRepository } = dependencies

  return async () => tripRequestRepository.findAll()
}
