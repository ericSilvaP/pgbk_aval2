# Quickstart: Trip Request Cancellation

## Prerequisites

- Node.js 20 or higher
- npm
- Docker and Docker Compose
- A local .env file based on .env.example

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

4. Apply the database schema and seed:

```bash
npm run init:db
```

## Run The API

```bash
npm run dev
```

The server should start on `http://localhost:3000` unless `PORT` is overridden.

## Validation Scenario 1: Successful `PATCH /trip-requests/:id/cancel`

Reset the table and insert one pending trip request directly into PostgreSQL:

```bash
docker exec pgbk_aval2_postgres psql -U postgres -d trip_requests_db \
  -c "DELETE FROM trip_requests; \
      INSERT INTO trip_requests (id, requester_name, origin, destination, departure_at, return_at, purpose, passenger_count, status, created_at) VALUES \
      ('11111111-1111-1111-1111-111111111111', 'Maria Silva', 'Fortaleza', 'Recife', '2026-07-10T11:00:00.000Z', '2026-07-12T21:30:00.000Z', 'Institutional meeting', 2, 'pending', '2026-06-26T15:45:10.123Z');"
```

Send the cancellation request and store the HTTP body for inspection:

```bash
curl -sS -o /tmp/trip-request-cancel-success.json -w '%{http_code}\n' \
  -X PATCH http://localhost:3000/trip-requests/11111111-1111-1111-1111-111111111111/cancel
```

Print the stored response body:

```bash
cat /tmp/trip-request-cancel-success.json
```

Expected response body:

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

Validation points:

- The command prints status code `200` on the last line.
- The response uses the standardized success envelope.
- `data.status` is `canceled`.
- `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, and `createdAt` match the original persisted values.
- `departureAt`, `returnAt`, and `createdAt` use the full UTC timestamp format `YYYY-MM-DDTHH:mm:ss.sssZ`.

Verify that the row still exists and only `status` changed:

```bash
docker exec pgbk_aval2_postgres psql -U postgres -d trip_requests_db \
  -c "SELECT id, requester_name, origin, destination, departure_at, return_at, purpose, passenger_count, status, created_at FROM trip_requests WHERE id = '11111111-1111-1111-1111-111111111111';"
```

Expected verification result:

- Exactly one row is returned.
- `status` is `canceled`.
- Every other selected column remains unchanged.
- The record was not deleted.

## Validation Scenario 2: Repeated cancellation returns `TRIP_REQUEST_ALREADY_CANCELED`

Call the same endpoint again:

```bash
curl -sS -o /tmp/trip-request-cancel-conflict.json -w '%{http_code}\n' \
  -X PATCH http://localhost:3000/trip-requests/11111111-1111-1111-1111-111111111111/cancel
```

Print the stored response body:

```bash
cat /tmp/trip-request-cancel-conflict.json
```

Expected response body:

```json
{
  "success": false,
  "error": {
    "code": "TRIP_REQUEST_ALREADY_CANCELED",
    "message": "Trip request is already canceled"
  }
}
```

Validation points:

- The command prints status code `409` on the last line.
- The response uses the standardized error envelope.
- The persisted row remains present and unchanged after the rejected request.

You can rerun the same SQL verification command from Scenario 1 to confirm the stored values did not change.

## Validation Scenario 3: Missing identifier returns `TRIP_REQUEST_NOT_FOUND`

```bash
curl -sS -o /tmp/trip-request-cancel-not-found.json -w '%{http_code}\n' \
  -X PATCH http://localhost:3000/trip-requests/33333333-3333-3333-3333-333333333333/cancel
```

Print the stored response body:

```bash
cat /tmp/trip-request-cancel-not-found.json
```

Expected response body:

```json
{
  "success": false,
  "error": {
    "code": "TRIP_REQUEST_NOT_FOUND",
    "message": "Trip request not found"
  }
}
```

Validation points:

- The command prints status code `404` on the last line.
- The response uses the standardized error envelope.
- No persisted row is created or deleted as a side effect.

## Validation Scenario 4: Repository failure returns the exact `500` envelope and hides internal details

Run the targeted cancellation failure test:

```bash
npm test -- tests/integration/trip-requests/cancel-trip-request.test.ts -t "returns 500 with the centralized internal error envelope and no leaked repository details"
```

Expected outcome:

- The test passes.
- The validated HTTP response is exactly:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal server error"
  }
}
```

- The assertions confirm the response body does not expose stack traces, Prisma details, SQL fragments, connection details, local file paths, source file paths, or `node_modules` paths.

## Validation Scenario 5: Automated quality gates

Run the required project scripts:

```bash
npm run build
npm run lint
npm test
```

Expected outcome:

- Build completes successfully.
- ESLint completes successfully.
- Tests cover successful cancellation of a pending record.
- Tests confirm the stored record remains present and only `status` changes.
- Tests cover `TRIP_REQUEST_NOT_FOUND` for a missing identifier.
- Tests cover `TRIP_REQUEST_ALREADY_CANCELED` for repeated cancellation.
- Tests cover the exact `INTERNAL_SERVER_ERROR` / `Internal server error` response for repository failures.
- Tests confirm that internal details do not leak in the `500` response.
- Tests keep the existing creation and retrieval flows green.
