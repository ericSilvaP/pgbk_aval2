# pgbk_aval2

REST API for institutional trip requests.

## Stack

- Node.js 20+
- TypeScript with `strict: true`
- Express 4
- Prisma Client 6
- PostgreSQL 16 via Docker Compose
- Zod 3 for request validation
- Vitest + Supertest for automated tests
- BrasilAPI as the production national-holidays source

Automated tests never call the real BrasilAPI. They inject `HolidaysProvider` doubles.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment variables:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d postgres
```

4. Apply migrations and seed the database:

```bash
npm run init:db
```

## Environment Variables

- `NODE_ENV`: `development`, `test`, or `production`
- `PORT`: API port, defaults to `3000`
- `DATABASE_URL`: PostgreSQL connection string
- `HOLIDAYS_API_BASE_URL`: BrasilAPI base URL used by the production `HolidaysProvider`

The default .env.example values match `docker-compose.yml`:

- PostgreSQL host port: `5434`
- Database name: `trip_requests_db`
- Holiday provider base URL: `https://brasilapi.com.br`

## Scripts

- `npm run dev`: start the API in watch mode
- `npm run build`: compile TypeScript to `dist/`
- `npm start`: run the compiled server
- `npm run init:db`: apply migrations and seed PostgreSQL
- `npm run lint`: run ESLint
- `npm test`: run Vitest integration tests

## Endpoints

All endpoints use standardized envelopes.

Success envelope:

```json
{
  "success": true,
  "data": {}
}
```

Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A clear and objective error message"
  }
}
```

### `POST /trip-requests`

Creates a trip request after local validation and national-holiday validation.

Request body:

```json
{
  "requesterName": "Maria Silva",
  "origin": "Fortaleza",
  "destination": "Recife",
  "departureAt": "2026-07-10T08:00:00-03:00",
  "returnAt": "2026-07-12T18:30:00-03:00",
  "purpose": "Institutional meeting",
  "passengerCount": 2
}
```

Rules:

- `id`, `status`, and `createdAt` are server-managed and must not be sent by the client.
- `departureAt` and `returnAt` must be valid date-time strings.
- `returnAt` must be equal to or later than `departureAt`.
- `passengerCount` must be greater than zero.
- The normalized UTC departure civil date must not match a national holiday.

Success response: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "9d716459-4fc8-4bd1-82d7-9df1f5569dd7",
    "requesterName": "Maria Silva",
    "origin": "Fortaleza",
    "destination": "Recife",
    "departureAt": "2026-07-10T11:00:00.000Z",
    "returnAt": "2026-07-12T21:30:00.000Z",
    "purpose": "Institutional meeting",
    "passengerCount": 2,
    "status": "pending",
    "createdAt": "2026-06-26T15:45:10.123Z"
  }
}
```

Validation error response: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "returnAt must be equal to or later than departureAt"
  }
}
```

Holiday rejection response: `409 Conflict`

```json
{
  "success": false,
  "error": {
    "code": "HOLIDAY_TRIP_NOT_ALLOWED",
    "message": "departureAt cannot fall on a national holiday"
  }
}
```

Holiday-provider unavailable response: `502 Bad Gateway`

```json
{
  "success": false,
  "error": {
    "code": "HOLIDAYS_API_UNAVAILABLE",
    "message": "national holidays are temporarily unavailable"
  }
}
```

Unexpected repository failure response: `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### `GET /trip-requests`

Lists all persisted trip requests in the standardized success envelope.

Behavior:

- Returns `200 OK` with `data` as an array.
- Returns an empty array when no trip requests exist.
- Returns canonical trip request fields with `departureAt`, `returnAt`, and `createdAt` as complete UTC ISO 8601 strings ending with `Z`.
- Collection order is not guaranteed. Clients and automated checks must verify list contents without relying on response ordering.

Success response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "requesterName": "Maria Silva",
      "origin": "Fortaleza",
      "destination": "Recife",
      "departureAt": "2026-07-10T11:00:00.000Z",
      "returnAt": "2026-07-12T21:30:00.000Z",
      "purpose": "Institutional meeting",
      "passengerCount": 2,
      "status": "pending",
      "createdAt": "2026-06-26T15:45:10.123Z"
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "requesterName": "Joao Costa",
      "origin": "Sobral",
      "destination": "Natal",
      "departureAt": "2026-08-03T13:00:00.000Z",
      "returnAt": "2026-08-05T18:00:00.000Z",
      "purpose": "Technical visit",
      "passengerCount": 3,
      "status": "canceled",
      "createdAt": "2026-06-27T09:00:00.000Z"
    }
  ]
}
```

Empty-list response: `200 OK`

```json
{
  "success": true,
  "data": []
}
```

Unexpected repository failure response: `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### `GET /trip-requests/:id`

Retrieves one persisted trip request by identifier in the standardized success envelope.

Behavior:

- Returns `200 OK` with the matching trip request when the id exists.
- Returns canonical trip request fields with `departureAt`, `returnAt`, and `createdAt` as complete UTC ISO 8601 strings ending with `Z`.
- Returns `404 Not Found` with `TRIP_REQUEST_NOT_FOUND` when no persisted trip request matches the provided id.

Success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "requesterName": "Maria Silva",
    "origin": "Fortaleza",
    "destination": "Recife",
    "departureAt": "2026-07-10T11:00:00.000Z",
    "returnAt": "2026-07-12T21:30:00.000Z",
    "purpose": "Institutional meeting",
    "passengerCount": 2,
    "status": "pending",
    "createdAt": "2026-06-26T15:45:10.123Z"
  }
}
```

Not-found response: `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "TRIP_REQUEST_NOT_FOUND",
    "message": "Trip request not found"
  }
}
```

Unexpected repository failure response: `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

Internal stack traces and database details never appear in HTTP response bodies.

### `PATCH /trip-requests/:id/cancel`

Cancels one persisted trip request by identifier in the standardized success envelope.

Behavior:

- No request body is required.
- Returns `200 OK` when the id exists and the trip request is still `pending`.
- A successful cancellation changes only `status` from `pending` to `canceled`.
- Cancellation does not delete the record.
- `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, and `createdAt` remain unchanged after a successful cancellation.
- `departureAt`, `returnAt`, and `createdAt` remain complete UTC timestamps in `YYYY-MM-DDTHH:mm:ss.sssZ` format.
- Returns `404 Not Found` with `TRIP_REQUEST_NOT_FOUND` when no persisted trip request matches the provided id.
- Returns `409 Conflict` with `TRIP_REQUEST_ALREADY_CANCELED` when the trip request was already canceled.
- Returns `500 Internal Server Error` with the standardized error envelope `{ "success": false, "error": { "code": "INTERNAL_SERVER_ERROR", "message": "Internal server error" } }` for unexpected repository failures.
- Internal stack traces, Prisma details, SQL fragments, connection details, local file paths, source file paths, and `node_modules` paths never appear in the `500` response body.

Success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "requesterName": "Maria Silva",
    "origin": "Fortaleza",
    "destination": "Recife",
    "departureAt": "2026-07-10T11:00:00.000Z",
    "returnAt": "2026-07-12T21:30:00.000Z",
    "purpose": "Institutional meeting",
    "passengerCount": 2,
    "status": "canceled",
    "createdAt": "2026-06-26T15:45:10.123Z"
  }
}
```

Not-found response: `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "TRIP_REQUEST_NOT_FOUND",
    "message": "Trip request not found"
  }
}
```

Already-canceled response: `409 Conflict`

```json
{
  "success": false,
  "error": {
    "code": "TRIP_REQUEST_ALREADY_CANCELED",
    "message": "Trip request is already canceled"
  }
}
```

Unexpected repository failure response: `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal server error"
  }
}
```

### `GET /holidays/:year`

Retrieves Brazilian national holidays for one year in the standardized success envelope.

Behavior:

- The `year` path parameter accepts only numeric four-digit years from `1000` to `9999`.
- Values such as `0000`, `0999`, `10000`, `abcd`, `20a5`, `25`, and `202` are rejected before any provider call.
- Returns `200 OK` with `data` as an array.
- Each holiday item contains exactly `date`, `name`, and `type`.
- Unknown upstream fields are excluded from the HTTP response body.
- The endpoint does not persist holiday data in PostgreSQL.
- The endpoint does not read or mutate trip-request data.
- Upstream non-success responses, timeouts, and invalid upstream payloads are normalized to `502 Bad Gateway` with `HOLIDAYS_API_UNAVAILABLE`.
- Unexpected internal failures return `500 Internal Server Error` with the standardized error envelope and no leaked internal details.

Success response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-01",
      "name": "Confraternizacao Universal",
      "type": "national"
    },
    {
      "date": "2025-04-21",
      "name": "Tiradentes",
      "type": "national"
    }
  ]
}
```

Empty-list response: `200 OK`

```json
{
  "success": true,
  "data": []
}
```

Invalid-year response: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "year must be a four-digit number between 1000 and 9999"
  }
}
```

Upstream-failure response: `502 Bad Gateway`

```json
{
  "success": false,
  "error": {
    "code": "HOLIDAYS_API_UNAVAILABLE",
    "message": "Holidays API unavailable"
  }
}
```

Unexpected internal-failure response: `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal server error"
  }
}
```

## Testing Notes

- Validation failures do not call `HolidaysProvider.getNationalHolidays()`.
- Validation failures do not call `TripRequestRepository.create()`.
- Holiday rejections and holiday-provider failures do not call `TripRequestRepository.create()`.
- `GET /trip-requests` tests use order-insensitive assertions for list contents because collection order is not guaranteed.
- Retrieval failure tests assert `INTERNAL_SERVER_ERROR` without exposing internal repository details.
- Cancellation failure tests assert the exact `Internal server error` message without exposing internal repository details.
- `GET /holidays/:year` tests use injected `HolidaysProvider` doubles or controlled `fetch` implementations, never access the real BrasilAPI, do not persist holiday data in PostgreSQL, and do not read or mutate trip-request data.

## Feature References

- Spec 001: `specs/001-trip-request-creation/spec.md`
- Plan 001: `specs/001-trip-request-creation/plan.md`
- Tasks 001: `specs/001-trip-request-creation/tasks.md`
- Contract 001: `specs/001-trip-request-creation/contracts/post-trip-requests.openapi.yaml`
- Quickstart 001: `specs/001-trip-request-creation/quickstart.md`
- Spec 002: `specs/002-trip-request-retrieval/spec.md`
- Plan 002: `specs/002-trip-request-retrieval/plan.md`
- Tasks 002: `specs/002-trip-request-retrieval/tasks.md`
- Contract 002: `specs/002-trip-request-retrieval/contracts/trip-requests-retrieval.openapi.yaml`
- Quickstart 002: `specs/002-trip-request-retrieval/quickstart.md`
- Spec 004: `specs/004-national-holiday-retrieval/spec.md`
- Plan 004: `specs/004-national-holiday-retrieval/plan.md`
- Tasks 004: `specs/004-national-holiday-retrieval/tasks.md`
- Contract 004: `specs/004-national-holiday-retrieval/contracts/holidays-retrieval.openapi.yaml`
- Quickstart 004: `specs/004-national-holiday-retrieval/quickstart.md`
