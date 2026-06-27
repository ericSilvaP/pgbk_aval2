# Implementation Plan: Trip Request Cancellation

**Branch**: `[003-trip-request-cancellation]` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-trip-request-cancellation/spec.md`

## Summary

Implement `PATCH /trip-requests/:id/cancel` on top of the existing Express, Prisma, and PostgreSQL architecture from Specs 001 and 002. The work extends `TripRequestRepository` and `PrismaTripRequestRepository` with cancellation persistence, adds a dedicated cancellation service and controller, registers the cancel endpoint in the existing trip request router, reuses the centralized error handler plus the standardized success and error envelopes, and verifies success, already-canceled, not-found, persistence, UTC-date, and unexpected-repository-failure behavior with Vitest integration tests backed by PostgreSQL.

## Technical Context

**Language/Version**: TypeScript 5 with Node.js 20 or higher; `strict: true`

**Primary Dependencies**: Express 4, Prisma Client 6, dotenv 16, Zod 3, Supertest 7

**Storage**: PostgreSQL 16 via Docker Compose, accessed through Prisma

**Testing**: Vitest 2 in Node environment with Supertest; integration tests use the existing PostgreSQL helper for real persistence checks and injected repository doubles only for unexpected repository failures

**Target Platform**: Backend-only REST API running on Node.js

**Project Type**: Single-service Express API with application factory, repository abstraction, centralized error handling, Prisma-backed persistence, and canonical response mapping

**Performance Goals**: Deterministic cancellation with one repository lookup to classify the request state, one repository write to persist the status transition, zero holiday-provider calls during cancellation, and consistent UTC serialization for every returned date field

**Constraints**: Preserve the existing `POST /trip-requests`, `GET /trip-requests`, and `GET /trip-requests/:id` flows unchanged; add only `PATCH /trip-requests/:id/cancel`; keep standardized success and error envelopes plus centralized error handling; ensure a successful cancellation updates only `status` from `pending` to `canceled`; keep `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, and `createdAt` unchanged; do not delete records; return `TRIP_REQUEST_NOT_FOUND` with HTTP `404` for missing identifiers; return `TRIP_REQUEST_ALREADY_CANCELED` with HTTP `409` for repeated cancellation attempts; return `INTERNAL_SERVER_ERROR` without leaking internal details for unexpected repository failures; add no schema migration, authentication, authorization, approval flow, vehicle allocation, driver allocation, holiday endpoint work, or frontend behavior

**Scale/Scope**: Cancellation of persisted `trip-requests` records only, including endpoint wiring, repository persistence, and integration coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Scope remains backend-only; no frontend, authentication, authorization, users, approvals, vehicles, drivers, check-in, check-out, mileage control, or administrative reports are added.
- [x] Required endpoints remain preserved: `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, `PATCH /trip-requests/:id/cancel`, and `GET /holidays/:year`.
- [x] `trip-requests` responses continue to use `id`, `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, `status`, and `createdAt`.
- [x] Success and error responses remain on the mandatory envelopes, with English UPPER_SNAKE_CASE internal error codes.
- [x] Centralized error handling remains responsible for mapping not-found, already-canceled, and unexpected cancellation errors to the required HTTP statuses.
- [x] A successful cancellation changes only `status` from `pending` to `canceled`, never deletes the record, and never mutates the other canonical fields.
- [x] `departureAt`, `returnAt`, and `createdAt` remain complete UTC ISO 8601 timestamps in all cancellation responses.
- [x] Holidays remain sourced only from BrasilAPI, but the cancellation flow performs no holiday-provider calls.
- [x] Database access remains isolated behind `TripRequestRepository` and the Prisma-backed implementation.
- [x] The existing Express app factory remains the composition root for production and integration tests.
- [x] Vitest coverage is planned for successful cancellation, persistence of the status change, missing id, already canceled, UTC date formatting, and unexpected repository failures.
- [x] README changes are not required unless implementation reveals missing setup or endpoint documentation.
- [x] Technical identifiers, files, scripts, tests, and documentation remain in English.

**Gate Result (pre-design)**: Pass. The requested work adds only the mandatory cancellation behavior on top of the current backend architecture.

**Gate Result (post-design)**: Pass. The design keeps repository, service, controller, router, mapper, and error boundaries consistent with the existing implementation while adding only the cancellation endpoint and tests.

## Project Structure

### Documentation (this feature)

```text
specs/003-trip-request-cancellation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── trip-request-cancellation.openapi.yaml
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
│   ├── cancel-trip-request-controller.ts
│   ├── create-trip-request-controller.ts
│   ├── get-trip-request-by-id-controller.ts
│   └── list-trip-requests-controller.ts
├── routes/
│   ├── index.ts
│   └── trip-request.routes.ts
├── services/
│   ├── cancel-trip-request-service.ts
│   ├── create-trip-request-service.ts
│   ├── get-trip-request-by-id-service.ts
│   └── list-trip-requests-service.ts
├── repositories/
│   ├── prisma-trip-request-repository.ts
│   └── trip-request-repository.ts
├── providers/
│   ├── brasil-api-holidays-provider.ts
│   └── holidays-provider.ts
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
        ├── cancel-trip-request.test.ts
        ├── create-trip-request.test.ts
        ├── get-trip-request-by-id.test.ts
        └── list-trip-requests.test.ts

prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

**Structure Decision**: Keep `src/app.ts` as the single composition root, register cancellation through the existing trip request router, add one cancellation service and one cancellation controller to match the current endpoint pattern, extend `TripRequestRepository` with one cancellation-specific persistence method instead of a generic state-mutation API, reuse `mapTripRequestToResponse()` and `sendSuccessResponse()` for the HTTP success contract, and keep PostgreSQL integration coverage under `tests/integration/trip-requests/` using the existing database helper for seeding and persistence assertions.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
