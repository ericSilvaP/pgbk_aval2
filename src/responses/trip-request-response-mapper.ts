import type { TripRequest } from '../repositories/trip-request-repository.js'

export interface TripRequestResponse {
  id: string
  requesterName: string
  origin: string
  destination: string
  departureAt: string
  returnAt: string
  purpose: string
  passengerCount: number
  status: TripRequest['status']
  createdAt: string
}

export function mapTripRequestToResponse(tripRequest: TripRequest): TripRequestResponse {
  return {
    id: tripRequest.id,
    requesterName: tripRequest.requesterName,
    origin: tripRequest.origin,
    destination: tripRequest.destination,
    departureAt: tripRequest.departureAt,
    returnAt: tripRequest.returnAt,
    purpose: tripRequest.purpose,
    passengerCount: tripRequest.passengerCount,
    status: tripRequest.status,
    createdAt: tripRequest.createdAt,
  }
}
