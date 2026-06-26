# Implementation Plan: Complete Trip Request Creation

**Branch**: `[001-trip-request-creation]` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-trip-request-creation/spec.md`

## Summary

Implement the complete, release-ready `POST /trip-requests` flow with strict layering between Express routing, application logic, holiday integration, and PostgreSQL persistence. The application will validate request shape and business rules locally, reject client-managed fields, normalize dates to UTC, call a replaceable `HolidaysProvider`, persist only approved requests with `status: "pending"`, and return standardized success or error envelopes through centralized formatting.

## Technical Context

**Language/Version**: TypeScript 5 with Node.js 20 or higher; `strict: true`

**Primary Dependencies**: Express 4, Prisma Client 6, Zod 3, dotenv 16, Supertest 7 for HTTP tests

**Storage**: PostgreSQL 16 via Docker Compose, accessed through Prisma

**Testing**: Vitest 2 in Node environment with Supertest; tests use a real PostgreSQL database and an injected `HolidaysProvider` double instead of the real BrasilAPI

**Target Platform**: Backend-only REST API running on Node.js

**Project Type**: Single-service Express API with repository and provider abstractions

**Performance Goals**: Single synchronous create request path with deterministic validation order, one holiday-provider lookup per eligible request, and one database write only after all validations succeed

**Constraints**: Preserve mandatory route and field names; use centralized success and error envelopes; normalize `departureAt`, `returnAt`, and `createdAt` to full UTC ISO 8601 strings; reject client-supplied `id`, `status`, and `createdAt`; validate `returnAt >= departureAt`; validate `passengerCount > 0`; block persistence on all validation and holiday failures; use `HolidaysProvider` before persistence; avoid direct Prisma or provider calls inside the route layer; keep tests free from the real BrasilAPI

**Scale/Scope**: Implement the complete `POST /trip-requests` flow, including local validation, holiday validation, centralized error handling, PostgreSQL persistence, and automated tests

## Canonical Request Flow

1. Receive the HTTP request.
2. Validate request fields.
3. Reject client-managed fields.
4. Validate and normalize dates.
5. Validate `returnAt >= departureAt`.
6. Validate `passengerCount > 0`.
7. Call `HolidaysProvider`.
8. Reject national holiday departures.
9. Persist with `status: "pending"`.
10. Return HTTP `201 Created`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Scope remains backend-only; no authentication, authorization, frontend, vehicle allocation, driver allocation, or other out-of-scope functionality is introduced.
- [x] The feature preserves the required `POST /trip-requests` route name and does not redefine any mandatory project route names.
- [x] The created resource uses the required `trip-requests` fields: `id`, `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, `status`, and `createdAt`.
- [x] Success and error responses remain standardized through centralized envelope formatting.
- [x] Centralized error handling remains responsible for mapping validation, holiday, provider, and unexpected persistence errors to the required HTTP statuses.
- [x] All mandatory local creation validations occur before persistence: required fields, field types, valid date-time parsing, `returnAt >= departureAt`, and `passengerCount > 0`.
- [x] National holiday validation occurs before persistence through a replaceable `HolidaysProvider` abstraction using `HOLIDAYS_API_BASE_URL`.
- [x] `departureAt`, `returnAt`, and `createdAt` are normalized to and returned as complete UTC ISO 8601 timestamps.
- [x] Database access is isolated behind repository components and uses the real PostgreSQL service defined in `docker-compose.yml`.
- [x] Tests remain in Vitest, use deterministic doubles for holiday integration, and never access the real BrasilAPI.
- [x] Technical identifiers, code, tests, and documentation artifacts remain in English.

**Gate Result (pre-design)**: Pass. The complete feature scope includes all mandatory validations before persistence.

**Gate Result (post-design)**: Pass. The design preserves the same full validation order, centralized error handling, replaceable holiday provider, and real PostgreSQL persistence.

## Project Structure

### Documentation (this feature)

```text
specs/001-trip-request-creation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── post-trip-requests.openapi.yaml
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
│   └── create-trip-request-controller.ts
├── routes/
│   ├── index.ts
│   └── trip-request.routes.ts
├── services/
│   └── create-trip-request-service.ts
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
        └── create-trip-request.test.ts
```

**Structure Decision**: Keep the existing global `config/` and `errors/` foundations, use `src/app.ts` as an application factory with injected repository and provider dependencies for tests, isolate Prisma in the repository layer, isolate holiday integration behind `HolidaysProvider`, and keep the route layer responsible only for HTTP wiring.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
