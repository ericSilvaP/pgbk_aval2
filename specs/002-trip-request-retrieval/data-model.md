# Data Model: Trip Request Retrieval

## Entities

### TripRequest

Persisted institutional trip request returned by both retrieval endpoints.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | string | Database | Unique identifier generated during persistence |
| `requesterName` | string | Database | Returned unchanged from the canonical trip request model |
| `origin` | string | Database | Returned unchanged |
| `destination` | string | Database | Returned unchanged |
| `departureAt` | UTC date-time string | Database mapped by repository | Returned as `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `returnAt` | UTC date-time string | Database mapped by repository | Returned as `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `purpose` | string | Database | Returned unchanged |
| `passengerCount` | number | Database | Returned unchanged |
| `status` | `pending` or `canceled` | Database | Current lifecycle state |
| `createdAt` | UTC date-time string | Database mapped by repository | Returned as `YYYY-MM-DDTHH:mm:ss.sssZ` |

### TripRequestCollection

Collection returned by `GET /trip-requests`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `data` | `TripRequest[]` | Yes | Empty array when no persisted records exist |

### TripRequestIdentifier

Path parameter used by `GET /trip-requests/:id`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Lookup key for one persisted trip request |

## Repository Contract

The existing repository abstraction is extended with read methods.

| Method | Return Type | Notes |
|--------|-------------|-------|
| `findAll()` | `Promise<TripRequest[]>` | Returns every persisted trip request in repository-defined order |
| `findById(id: string)` | `Promise<TripRequest \| null>` | Returns the matching trip request or `null` when absent |
| `create(input)` | Existing method | Remains unchanged for creation flow |

## Persistence Model

### Prisma Model: `TripRequest`

The retrieval feature reuses the existing Prisma model without schema changes.

- Table: `trip_requests`
- Primary key: `id`
- Enum: `TripRequestStatus` with `pending` and `canceled`
- Column mappings:
  - `requesterName` -> `requester_name`
  - `departureAt` -> `departure_at`
  - `returnAt` -> `return_at`
  - `passengerCount` -> `passenger_count`
  - `createdAt` -> `created_at`

## Retrieval Rules

1. `GET /trip-requests` returns a success envelope whose `data` field is always an array.
2. When the persistence layer has no trip requests, `GET /trip-requests` returns `data: []`.
3. `GET /trip-requests/:id` returns the matching `TripRequest` when the repository finds one record.
4. When `findById()` returns `null`, the application raises `TRIP_REQUEST_NOT_FOUND` and the centralized error handler emits HTTP `404`.
5. Every returned date field remains a complete UTC ISO 8601 string ending with `Z`.
6. Retrieval does not mutate trip request state and does not call the holidays provider.

## Failure Model

- Missing identifier match: `TRIP_REQUEST_NOT_FOUND` with HTTP `404`
- Unexpected repository failure during list or lookup: `INTERNAL_SERVER_ERROR` with HTTP `500`
- Retrieval responses never expose table names, SQL text, stack traces, or database connection details

## Relationships

- `TripRequestCollection` is a read-only collection of `TripRequest` records.
- `TripRequestIdentifier` selects at most one `TripRequest`.
- No new database relationships or schema migrations are required for this feature.
