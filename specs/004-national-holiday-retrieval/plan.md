# Implementation Plan: National Holiday Retrieval

**Branch**: `[]` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-national-holiday-retrieval/spec.md`

## Summary

Implement `GET /holidays/:year` on top of the existing Express application factory, centralized error handling, standardized response envelopes, and replaceable `HolidaysProvider` abstraction. The work reuses the current BrasilAPI integration entry point but tightens the holiday DTO contract to require `date`, `name`, and `type`, adds explicit year-path validation, introduces a dedicated holiday retrieval service and controller, registers the new route without changing trip-request endpoints, and verifies success, validation failure, upstream failure, timeout, invalid payload, empty-list, and unexpected internal-failure behavior with deterministic Vitest integration tests that never call the real BrasilAPI.

## Technical Context

**Language/Version**: TypeScript 5 with Node.js 20 or higher; `strict: true`

**Primary Dependencies**: Express 4, Prisma Client 6, dotenv 16, Zod 3, Supertest 7

**Storage**: PostgreSQL 16 via Docker Compose remains the project database, but this feature is read-only and persists no holiday data

**Testing**: Vitest 2 in Node environment with Supertest; external holiday behavior must be exercised through injected doubles or controlled fetch implementations instead of live network access, and timeout behavior must be simulated deterministically without calling the real BrasilAPI

**Target Platform**: Backend-only REST API running on Node.js

**Project Type**: Single-service Express API with application factory, dependency injection through `createApp()`, centralized error handling, Prisma-backed trip-request persistence, and isolated external integrations

**Performance Goals**: One validated upstream lookup per request, a fixed 5000 ms upstream timeout enforced with `AbortController`, deterministic error mapping for all upstream failures, and no database reads or writes during holiday retrieval

**Constraints**: Preserve `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, and `PATCH /trip-requests/:id/cancel` behavior unchanged; add only `GET /holidays/:year`; accept only four-digit numeric years from `1000` to `9999`; use `HOLIDAYS_API_BASE_URL` and the BrasilAPI national holidays endpoint; enforce a fixed 5000 ms timeout for external BrasilAPI requests with `AbortController`; return only `date`, `name`, and `type`; return `VALIDATION_ERROR` for invalid year values; convert timeout, unavailability, non-success status, and invalid upstream payload failures to `HOLIDAYS_API_UNAVAILABLE` with HTTP `502`; surface unexpected failures through centralized `INTERNAL_SERVER_ERROR` handling; do not add authentication, authorization, caching, persistence, or frontend behavior

**Scale/Scope**: One read-only holidays endpoint plus its provider hardening, route wiring, documentation, and deterministic test coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Scope remains backend-only; no frontend, authentication, authorization, users, approvals, vehicles, drivers, check-in, check-out, mileage control, or administrative reports are added.
- [x] Required endpoints remain preserved: `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, `PATCH /trip-requests/:id/cancel`, and `GET /holidays/:year`.
- [x] `trip-requests` responses continue to use `id`, `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, `status`, and `createdAt`.
- [x] Success and error responses remain on the mandatory envelopes, with English UPPER_SNAKE_CASE internal error codes.
- [x] Centralized error handling remains responsible for mapping validation, holiday-provider, and unexpected errors to the required HTTP statuses.
- [x] Trip-request creation, retrieval, and cancellation behavior remain unchanged; this feature is read-only and does not create, mutate, or cancel trip requests.
- [x] `departureAt`, `returnAt`, and `createdAt` remain complete UTC ISO 8601 timestamps in existing trip-request flows; the new holidays endpoint returns only `date`, `name`, and `type`.
- [x] Holidays remain sourced only from BrasilAPI using `HOLIDAYS_API_BASE_URL`; no hardcoded, manual, cached, or persisted holiday list is introduced.
- [x] BrasilAPI access remains isolated behind a replaceable provider/client abstraction and stays mockable in tests.
- [x] Database access remains isolated behind persistence components and is not used by the holidays retrieval flow.
- [x] The existing Express app factory remains the single composition root for production and integration tests.
- [x] Vitest coverage is planned for successful retrieval, empty array success, invalid year, upstream unavailability, timeout, non-success response, invalid payload, and unexpected internal failures.
- [x] README, quickstart, and OpenAPI updates are planned for the new endpoint and its standardized success and error behavior.
- [x] Technical identifiers, files, scripts, tests, and documentation remain in English.

**Gate Result (pre-design)**: Pass. The requested work adds only the mandatory holiday retrieval behavior while preserving the existing backend architecture and contracts.

**Gate Result (post-design)**: Pass. The design reuses the current provider boundary, application factory, and error handling while adding one route, one service, one controller, year validation, and deterministic tests without expanding the feature scope.

## Project Structure

### Documentation (this feature)

```text
specs/004-national-holiday-retrieval/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── holidays-retrieval.openapi.yaml
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
│   ├── get-holidays-controller.ts
│   ├── create-trip-request-controller.ts
│   ├── get-trip-request-by-id-controller.ts
│   └── list-trip-requests-controller.ts
├── routes/
│   ├── holidays.routes.ts
│   ├── index.ts
│   └── trip-request.routes.ts
├── services/
│   ├── cancel-trip-request-service.ts
│   ├── get-holidays-service.ts
│   ├── create-trip-request-service.ts
│   ├── get-trip-request-by-id-service.ts
│   └── list-trip-requests-service.ts
├── providers/
│   ├── brasil-api-holidays-provider.ts
│   └── holidays-provider.ts
├── responses/
│   ├── holiday-response-mapper.ts
│   ├── send-success-response.ts
│   └── trip-request-response-mapper.ts
├── validation/
│   ├── holiday-schemas.ts
│   └── trip-request-schemas.ts
└── errors/
    ├── app-error.ts
    └── error-handler.ts

tests/
├── helpers/
│   └── database.ts
└── integration/
    ├── holidays/
    │   └── get-holidays.test.ts
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

**Structure Decision**: Keep `src/app.ts` as the composition root and extend it with one holiday retrieval service/controller pair wired through a dedicated `holidays.routes.ts` module so trip-request routing stays isolated. Reuse `src/providers/holidays-provider.ts` and `src/providers/brasil-api-holidays-provider.ts` as the external integration boundary, strengthen their DTO contract to require `type`, enforce a fixed 5000 ms BrasilAPI timeout with `AbortController` inside the provider, convert timeout failures to `HOLIDAYS_API_UNAVAILABLE` with HTTP `502`, add `src/validation/holiday-schemas.ts` for path validation and provider payload validation if needed, and keep holiday integration coverage under `tests/integration/holidays/` with injected doubles or fetch stubs that simulate timeout deterministically instead of live network access.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
