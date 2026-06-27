# Implementation Plan: Trip Request Retrieval

**Branch**: `[002-trip-request-retrieval]` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-trip-request-retrieval/spec.md`

## Summary

Implement read-only trip request retrieval on top of the existing Express, Prisma, and PostgreSQL architecture from Spec 001. The work extends `TripRequestRepository` and `PrismaTripRequestRepository` with list and lookup methods, adds dedicated retrieval services and controllers, registers `GET /trip-requests` and `GET /trip-requests/:id` in the existing trip request router, reuses the standardized success and error envelopes plus the trip request response mapper, and verifies empty-list, populated-list, found, not-found, UTC-date, unordered-list, and repository-failure behavior with Vitest integration tests.

## Technical Context

**Language/Version**: TypeScript 5 with Node.js 20 or higher; `strict: true`

**Primary Dependencies**: Express 4, Prisma Client 6, dotenv 16, Zod 3, Supertest 7

**Storage**: PostgreSQL 16 via Docker Compose, accessed through Prisma

**Testing**: Vitest 2 in Node environment with Supertest; integration tests use the existing PostgreSQL helper and injected doubles only for unexpected repository failures or unused holiday-provider wiring, and list assertions must be order-insensitive because the API does not guarantee collection order

**Target Platform**: Backend-only REST API running on Node.js

**Project Type**: Single-service Express API with application factory, repository abstraction, centralized error handling, and Prisma-backed persistence

**Performance Goals**: Deterministic read-only retrieval with one repository read for collection listing, one repository read for single-record lookup, zero holiday-provider calls during retrieval, and consistent UTC serialization for every returned date field

**Constraints**: Preserve the existing `POST /trip-requests` flow except for safe repository or mapper contract reuse; keep standardized success and error envelopes, centralized error handling, and the Express app factory; add only `GET /trip-requests` and `GET /trip-requests/:id`; return an empty array when no records exist; return all persisted trip requests without guaranteeing collection order; require order-insensitive list assertions in automated tests; return `TRIP_REQUEST_NOT_FOUND` with HTTP `404` for missing identifiers; return `INTERNAL_SERVER_ERROR` for unexpected repository failures without leaking internal details; do not add pagination, filtering, sorting, authentication, authorization, holiday lookups, or frontend behavior

**Scale/Scope**: Retrieval of persisted `trip-requests` records only, including list-all and get-by-id behavior plus integration coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Scope remains backend-only; no frontend, authentication, authorization, users, approvals, vehicles, drivers, check-in, check-out, mileage control, or administrative reports are added.
- [x] Required endpoints remain preserved: `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, `PATCH /trip-requests/:id/cancel`, and `GET /holidays/:year`.
- [x] `trip-requests` responses continue to use `id`, `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, `status`, and `createdAt`.
- [x] Success and error responses remain on the mandatory envelopes, with English UPPER_SNAKE_CASE internal error codes.
- [x] Centralized error handling remains responsible for mapping not-found and unexpected retrieval errors to the required HTTP statuses.
- [x] The existing creation flow and holiday validation remain intact; retrieval adds read-only behavior without changing creation rules.
- [x] `departureAt`, `returnAt`, and `createdAt` remain complete UTC ISO 8601 timestamps in all retrieval responses.
- [x] Retrieval introduces no new holiday data source and makes no holiday-provider calls.
- [x] Database access remains isolated behind `TripRequestRepository` and the Prisma-backed implementation.
- [x] The existing Express app factory remains the composition root for production and integration tests.
- [x] Vitest coverage is planned for empty list, populated list, existing id, missing id, UTC date formatting, and unexpected repository failures.
- [x] The `GET /trip-requests` contract is explicitly unordered, so consumers and automated tests must not rely on response ordering.
- [x] README changes are not required unless implementation reveals missing setup or endpoint documentation.
- [x] Technical identifiers, files, scripts, tests, and documentation remain in English.

**Gate Result (pre-design)**: Pass. The requested work extends the existing architecture with retrieval-only behavior and no constitutional violations.

**Gate Result (post-design)**: Pass. The design keeps repository, controller, service, and response boundaries consistent with Spec 001 while adding only the required retrieval endpoints and tests.

## Project Structure

### Documentation (this feature)

```text
specs/002-trip-request-retrieval/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── trip-requests-retrieval.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app.ts
├── index.ts
├── server.ts
├── config/
│   ├── env.ts
│   └── prisma.ts
├── controllers/
│   ├── create-trip-request-controller.ts
│   ├── get-trip-request-by-id-controller.ts
│   └── list-trip-requests-controller.ts
├── routes/
│   ├── index.ts
│   └── trip-request.routes.ts
├── services/
│   ├── create-trip-request-service.ts
│   ├── get-trip-request-by-id-service.ts
│   └── list-trip-requests-service.ts
├── repositories/
│   ├── trip-request-repository.ts
│   └── prisma-trip-request-repository.ts
├── providers/
│   ├── holidays-provider.ts
│   └── brasil-api-holidays-provider.ts
├── responses/
│   ├── send-success-response.ts
│   └── trip-request-response-mapper.ts
├── validation/
│   └── trip-request-schemas.ts
└── errors/
    ├── app-error.ts
    └── error-handler.ts

tests/
├── helpers/
│   └── database.ts
└── integration/
    └── trip-requests/
        ├── create-trip-request.test.ts
        ├── get-trip-request-by-id.test.ts
        └── list-trip-requests.test.ts

prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

**Structure Decision**: Keep the current application factory and router composition intact, extend the repository contract instead of introducing a parallel read model, add one service and one controller per retrieval endpoint to mirror the existing creation flow, reuse the existing response mapper and success helper for serialization, extend the PostgreSQL test helper only where necessary to seed and inspect retrieval records deterministically, and keep list verification order-insensitive because the API does not guarantee collection order.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
