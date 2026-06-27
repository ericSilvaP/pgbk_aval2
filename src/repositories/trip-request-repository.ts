export type TripRequestStatus = 'pending' | 'canceled'

export interface CreateTripRequestRecord {
  requesterName: string
  origin: string
  destination: string
  departureAt: string
  returnAt: string
  purpose: string
  passengerCount: number
  status: Extract<TripRequestStatus, 'pending'>
}

export interface TripRequest {
  id: string
  requesterName: string
  origin: string
  destination: string
  departureAt: string
  returnAt: string
  purpose: string
  passengerCount: number
  status: TripRequestStatus
  createdAt: string
}

export interface TripRequestRepository {
  create(input: CreateTripRequestRecord): Promise<TripRequest>
}
