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

The default `.env.example` values match `docker-compose.yml`:

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

## Testing Notes

- Validation failures do not call `HolidaysProvider.getNationalHolidays()`.
- Validation failures do not call `TripRequestRepository.create()`.
- Holiday rejections and holiday-provider failures do not call `TripRequestRepository.create()`.
- `GET /trip-requests` tests use order-insensitive assertions for list contents because collection order is not guaranteed.
- Retrieval failure tests assert `INTERNAL_SERVER_ERROR` without exposing internal repository details.
- Tests use injected `HolidaysProvider` fakes and never access the real BrasilAPI.

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
