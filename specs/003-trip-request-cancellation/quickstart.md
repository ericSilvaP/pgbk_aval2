# Quickstart: Trip Request Cancellation

## Prerequisites

- Node.js 20 or higher
- npm
- Docker and Docker Compose
- A local `.env` file based on `.env.example`

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

Insert one pending trip request directly into PostgreSQL:

```bash
docker exec pgbk_aval2_postgres psql -U postgres -d trip_requests_db \
  -c "DELETE FROM trip_requests; \
      INSERT INTO trip_requests (id, requester_name, origin, destination, departure_at, return_at, purpose, passenger_count, status, created_at) VALUES \
      ('11111111-1111-1111-1111-111111111111', 'Maria Silva', 'Fortaleza', 'Recife', '2026-07-10T11:00:00.000Z', '2026-07-12T21:30:00.000Z', 'Institutional meeting', 2, 'pending', '2026-06-26T15:45:10.123Z');"
```

Request the cancellation:

```bash
curl -i -X PATCH http://localhost:3000/trip-requests/11111111-1111-1111-1111-111111111111/cancel
```

Expected outcome:

- HTTP `200 OK`
- Body follows the standardized success envelope
- `data.status` is `canceled`
- `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, and `createdAt` match the preexisting values
- `departureAt`, `returnAt`, and `createdAt` end with `Z`

Verify the record still exists and only `status` changed:

```bash
docker exec pgbk_aval2_postgres psql -U postgres -d trip_requests_db \
  -c "SELECT id, requester_name, origin, destination, departure_at, return_at, purpose, passenger_count, status, created_at FROM trip_requests WHERE id = '11111111-1111-1111-1111-111111111111';"
```

Expected outcome:

- One row is returned
- `status` is `canceled`
- The other stored column values remain unchanged

## Validation Scenario 2: Repeated cancellation returns `TRIP_REQUEST_ALREADY_CANCELED`

Call the same endpoint again:

```bash
curl -i -X PATCH http://localhost:3000/trip-requests/11111111-1111-1111-1111-111111111111/cancel
```

Expected outcome:

- HTTP `409 Conflict`
- Error envelope with `TRIP_REQUEST_ALREADY_CANCELED`
- Message is `Trip request is already canceled`
- Database state remains unchanged after the rejected request

## Validation Scenario 3: Missing identifier returns `TRIP_REQUEST_NOT_FOUND`

```bash
curl -i -X PATCH http://localhost:3000/trip-requests/33333333-3333-3333-3333-333333333333/cancel
```

Expected outcome:

- HTTP `404 Not Found`
- Error envelope with `TRIP_REQUEST_NOT_FOUND`
- Message is `Trip request not found`

## Validation Scenario 4: Unexpected repository failure

Temporarily stop PostgreSQL while the API is running:

```bash
docker compose stop postgres
```

Then request the cancellation endpoint:

```bash
curl -i -X PATCH http://localhost:3000/trip-requests/11111111-1111-1111-1111-111111111111/cancel
```

Expected outcome:

- HTTP `500 Internal Server Error`
- Error envelope with `INTERNAL_SERVER_ERROR`
- No internal database details are exposed

Restart PostgreSQL after the check:

```bash
docker compose up -d postgres
```

## Validation Scenario 5: Automated quality gates

```bash
npm run build
npm run lint
npm test
```

Expected outcome:

- Build completes successfully
- ESLint completes successfully
- Tests cover successful cancellation of a pending record
- Tests confirm the stored record remains present and only `status` changes
- Tests cover `TRIP_REQUEST_NOT_FOUND` for a missing identifier
- Tests cover `TRIP_REQUEST_ALREADY_CANCELED` for repeated cancellation
- Tests cover UTC date serialization in the successful cancellation response
- Tests cover unexpected repository failures through injected doubles
- Tests keep the existing creation and retrieval flows green
