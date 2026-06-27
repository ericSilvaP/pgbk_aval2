# Quickstart: Trip Request Retrieval

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

## Validation Scenario 1: Empty `GET /trip-requests`

Make sure the table has no trip requests before calling the endpoint:

```bash
docker exec pgbk_aval2_postgres psql -U postgres -d trip_requests_db \
  -c 'DELETE FROM trip_requests;'
```

Then request the collection:

```bash
curl -i http://localhost:3000/trip-requests
```

Expected outcome:

- HTTP `200 OK`
- Body follows the standardized success envelope
- `data` is an empty array

## Validation Scenario 2: Populated `GET /trip-requests`

Insert representative records directly into PostgreSQL:

```bash
docker exec pgbk_aval2_postgres psql -U postgres -d trip_requests_db \
  -c "INSERT INTO trip_requests (id, requester_name, origin, destination, departure_at, return_at, purpose, passenger_count, status, created_at) VALUES \
  ('11111111-1111-1111-1111-111111111111', 'Maria Silva', 'Fortaleza', 'Recife', '2026-07-10T11:00:00.000Z', '2026-07-12T21:30:00.000Z', 'Institutional meeting', 2, 'pending', '2026-06-26T15:45:10.123Z'), \
  ('22222222-2222-2222-2222-222222222222', 'Joao Costa', 'Sobral', 'Natal', '2026-08-03T13:00:00.000Z', '2026-08-05T18:00:00.000Z', 'Technical visit', 3, 'canceled', '2026-06-27T09:00:00.000Z');"
```

Request the collection again:

```bash
curl -i http://localhost:3000/trip-requests
```

Expected outcome:

- HTTP `200 OK`
- Body follows the standardized success envelope
- `data` contains both persisted trip requests
- `departureAt`, `returnAt`, and `createdAt` end with `Z`
- Field names match the canonical trip request contract

## Validation Scenario 3: Existing `GET /trip-requests/:id`

```bash
curl -i http://localhost:3000/trip-requests/11111111-1111-1111-1111-111111111111
```

Expected outcome:

- HTTP `200 OK`
- Body follows the standardized success envelope
- `data.id` matches the requested identifier
- Date fields are complete UTC ISO 8601 timestamps

## Validation Scenario 4: Missing `GET /trip-requests/:id`

```bash
curl -i http://localhost:3000/trip-requests/33333333-3333-3333-3333-333333333333
```

Expected outcome:

- HTTP `404 Not Found`
- Error envelope with `TRIP_REQUEST_NOT_FOUND`
- Message is `Trip request not found`

## Validation Scenario 5: Unexpected repository failure

Temporarily stop PostgreSQL while the API is running:

```bash
docker compose stop postgres
```

Then request either retrieval endpoint:

```bash
curl -i http://localhost:3000/trip-requests
```

Expected outcome:

- HTTP `500 Internal Server Error`
- Error envelope with `INTERNAL_SERVER_ERROR`
- No internal database details are exposed

Restart PostgreSQL after the check:

```bash
docker compose up -d postgres
```

## Validation Scenario 6: Automated quality gates

```bash
npm run build
npm run lint
npm test
```

Expected outcome:

- Build completes successfully
- ESLint completes successfully
- Tests cover empty list and populated list retrieval
- Tests cover successful get-by-id retrieval
- Tests cover `TRIP_REQUEST_NOT_FOUND` for a missing identifier
- Tests cover UTC date serialization in retrieval responses
- Tests cover unexpected repository failures through injected doubles
- Tests keep the existing creation flow green
