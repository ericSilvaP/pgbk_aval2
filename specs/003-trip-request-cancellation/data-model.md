# Data Model: Trip Request Cancellation

## Entities

### TripRequest

Persisted institutional trip request returned before and after cancellation.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | string | Database | Unique identifier generated during persistence |
| `requesterName` | string | Database | Must remain unchanged by cancellation |
| `origin` | string | Database | Must remain unchanged by cancellation |
| `destination` | string | Database | Must remain unchanged by cancellation |
| `departureAt` | UTC date-time string | Database mapped by repository | Returned as `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `returnAt` | UTC date-time string | Database mapped by repository | Returned as `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `purpose` | string | Database | Must remain unchanged by cancellation |
| `passengerCount` | number | Database | Must remain unchanged by cancellation |
| `status` | `pending` or `canceled` | Database | Only mutable field in this feature |
| `createdAt` | UTC date-time string | Database mapped by repository | Must remain unchanged by cancellation |

### TripRequestCancellationCommand

Path-parameter input used by `PATCH /trip-requests/:id/cancel`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Identifier of the persisted trip request to cancel |

### TripRequestCancellationResult

Successful cancellation result returned in the standard success envelope.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `data` | `TripRequest` | Yes | Canonical trip request with `status: "canceled"` |

## State Transition

The feature introduces one valid lifecycle transition:

| Current Status | Operation | Next Status | Allowed |
|----------------|-----------|-------------|---------|
| `pending` | `PATCH /trip-requests/:id/cancel` | `canceled` | Yes |
| `canceled` | `PATCH /trip-requests/:id/cancel` | `canceled` | No, return `TRIP_REQUEST_ALREADY_CANCELED` |

`canceled` is terminal for this feature. No transition back to `pending` is allowed.

## Repository Contract

The existing repository abstraction is extended with one cancellation write method.

| Method | Return Type | Notes |
|--------|-------------|-------|
| `findById(id: string)` | `Promise<TripRequest \| null>` | Existing lookup used to classify missing and already-canceled requests |
| `cancelById(id: string)` | `Promise<TripRequest>` | Persists the status change to `canceled` and returns the updated record |
| `findAll()` | Existing method | Remains unchanged for retrieval flow |
| `create(input)` | Existing method | Remains unchanged for creation flow |

## Persistence Model

### Prisma Model: `TripRequest`

The cancellation feature reuses the existing Prisma model without schema changes.

- Table: `trip_requests`
- Primary key: `id`
- Enum: `TripRequestStatus` with `pending` and `canceled`
- Columns updated by this feature:
  - `status` only
- Columns that must remain unchanged on successful cancellation:
  - `requester_name`
  - `origin`
  - `destination`
  - `departure_at`
  - `return_at`
  - `purpose`
  - `passenger_count`
  - `created_at`

## Cancellation Rules

1. `PATCH /trip-requests/:id/cancel` accepts only the path parameter; no request body is required.
2. When `findById()` returns `null`, the application raises `TRIP_REQUEST_NOT_FOUND` and the centralized error handler emits HTTP `404`.
3. When the located trip request already has `status: "canceled"`, the application raises `TRIP_REQUEST_ALREADY_CANCELED` and the centralized error handler emits HTTP `409`.
4. When the located trip request has `status: "pending"`, the repository persists only the `status` change to `canceled`.
5. Successful cancellation returns the canonical trip request shape with `status: "canceled"` and all other fields unchanged.
6. `departureAt`, `returnAt`, and `createdAt` remain complete UTC ISO 8601 strings ending with `Z`.
7. Cancellation never deletes the row and never calls the holidays provider.

## Failure Model

- Missing identifier match: `TRIP_REQUEST_NOT_FOUND` with HTTP `404`
- Repeated cancellation of an already canceled record: `TRIP_REQUEST_ALREADY_CANCELED` with HTTP `409`
- Unexpected repository failure during lookup or write: `INTERNAL_SERVER_ERROR` with HTTP `500`
- Error responses never expose stack traces, SQL text, table names, connection details, or raw Prisma errors

## Relationships

- `TripRequestCancellationCommand` targets at most one persisted `TripRequest`.
- `TripRequestCancellationResult` returns that same `TripRequest` after the allowed `pending -> canceled` transition.
- No new database relationships, tables, enums, or migrations are required for this feature.
