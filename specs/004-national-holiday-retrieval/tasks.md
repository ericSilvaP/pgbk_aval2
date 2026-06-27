# Tasks: National Holiday Retrieval

**Input**: Design documents from `/specs/004-national-holiday-retrieval/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/holidays-retrieval.openapi.yaml`, `quickstart.md`

**Tests**: Deterministic Vitest integration tests are mandatory for valid-year success, invalid-year validation, upstream non-success, timeout, invalid payload, and unexpected internal-failure behavior.

**Organization**: Tasks follow the four implementation phases requested for this feature while keeping `US1`, `US2`, and `US3` labels on story-specific verification work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`)
- Every task includes an exact file path, an observable completion condition, and dependency notes where needed

## Phase 1: Holidays Provider/Client Abstraction And Types

**Purpose**: Reuse and tighten the BrasilAPI integration boundary so the new endpoint depends on a single validated holiday contract.

- [X] T001 Update `src/providers/holidays-provider.ts` to make the holiday DTO require `date`, `name`, and `type` and keep `getNationalHolidays(year: number): Promise<HolidayRecord[]>` as the shared abstraction; complete when the provider contract exposes only the three required fields, keeps the existing injectable interface name, and compiles without changing trip-request route signatures; blocks T002-T016.
- [X] T002 Update `src/providers/brasil-api-holidays-provider.ts` to validate the BrasilAPI national-holidays response for `/api/feriados/v1/{year}` using `HOLIDAYS_API_BASE_URL`; complete when the provider builds the request URL from the configured base URL, enforces a fixed 5000 ms timeout with `AbortController`, converts timeout/abort failures into the same provider-failure path used for `HOLIDAYS_API_UNAVAILABLE`, rejects other fetch failures, non-`2xx` responses, non-array payloads, and items missing `date`, `name`, or `type` by throwing `HolidaysProviderError`, normalizes the external payload instead of passing through unknown upstream fields, and never persists holidays; depends on T001.
- [X] T003 [P] Create `src/responses/holiday-response-mapper.ts` to return only `date`, `name`, and `type` from validated provider records; complete when the mapper strips any extra upstream properties, preserves array item order, guarantees that holiday response items contain exactly `date`, `name`, and `type`, and can be reused by the controller without touching trip-request response mappers; depends on T001.

---

## Phase 2: Validation, Service, Controller, And Route Registration

**Purpose**: Add `GET /holidays/:year` to the existing Express architecture without changing the behavior of trip-request endpoints.

- [ ] T004 Create `src/validation/holiday-schemas.ts` with a parser for `request.params.year`; complete when the parser accepts only four-digit numeric years from `1000` to `9999`, rejects `0000`, `0999`, `10000`, `abcd`, `20a5`, `25`, and `202`, returns a numeric year for valid input, and throws `VALIDATION_ERROR` before any provider call; depends on T001.
- [ ] T005 Create `src/services/get-holidays-service.ts` to orchestrate holiday retrieval through `HolidaysProvider`; complete when the service accepts a validated numeric year, calls `holidaysProvider.getNationalHolidays(year)` exactly once, returns a read-only holiday array, maps `HolidaysProviderError` to `HOLIDAYS_API_UNAVAILABLE` with message `Holidays API unavailable`, performs no PostgreSQL reads/writes, and lets non-provider failures bubble to centralized `INTERNAL_SERVER_ERROR` handling; depends on T002 and T004.
- [ ] T006 Create `src/controllers/get-holidays-controller.ts` following the existing controller pattern; complete when the controller reads `request.params.year`, uses the year parser from `src/validation/holiday-schemas.ts`, delegates to the holidays service, returns HTTP `200` through `sendSuccessResponse()` with `data` as an array of `{ date, name, type }`, and forwards all errors to the centralized handler without route-local formatting; depends on T003, T004, and T005.
- [ ] T007 Create `src/routes/holidays.routes.ts` to register the holidays resource; complete when the router exposes only `GET /holidays/:year` and depends only on the holidays controller for this feature; depends on T006.
- [ ] T008 Update `src/routes/index.ts` to mount the holidays router alongside `/health` and the existing trip-request router; complete when `GET /holidays/:year` is reachable through the main router and `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, and `PATCH /trip-requests/:id/cancel` remain registered unchanged; depends on T007.
- [ ] T009 Update `src/app.ts` to compose `createGetHolidaysService()` and `createGetHolidaysController()` using the existing `holidaysProvider` dependency; complete when `createApp()` wires the new route through the shared application factory, keeps centralized error handling intact, and preserves the current trip-request composition path unchanged; depends on T005, T006, and T008.

---

## Phase 3: Integration Tests With Deterministic External API Mocks/Fakes

**Purpose**: Prove the endpoint contract end-to-end without calling the real BrasilAPI service.

**Independent Test Criteria**

- **US1**: `GET /holidays/2025` returns HTTP `200`, `{ "success": true, "data": [...] }`, `data` as an array, and every holiday item includes `date`, `name`, and `type`; an empty provider result still returns HTTP `200` with `data: []`.
- **US2**: `GET /holidays/:year` with `0000`, `0999`, `10000`, `abcd`, `20a5`, `25`, and `202` returns HTTP `400` with `VALIDATION_ERROR`, and the holidays provider fake is never called.
- **US3**: `GET /holidays/:year` with simulated upstream non-success, timeout, or invalid payload returns HTTP `502` with `HOLIDAYS_API_UNAVAILABLE`, and an unexpected internal failure returns the standardized `INTERNAL_SERVER_ERROR` envelope without leaking internal details.

- [ ] T010 [US1] Create success-path integration coverage in `tests/integration/holidays/get-holidays.test.ts`; complete when the suite proves a valid year returns HTTP `200`, `success: true`, `data` as an array, each returned holiday item contains exactly the keys `date`, `name`, and `type`, extra upstream fields from BrasilAPI are excluded from the HTTP response, an empty upstream list still returns `data: []`, and all scenarios run through `createApp()` with a deterministic holidays-provider fake instead of the real BrasilAPI; depends on T009.
- [ ] T011 [US2] Extend `tests/integration/holidays/get-holidays.test.ts` with invalid-year coverage for `0000`, `0999`, `10000`, `abcd`, `20a5`, `25`, and `202`; complete when each case returns HTTP `400` with `VALIDATION_ERROR`, uses the standardized error envelope, and proves the holidays-provider fake is not called for rejected input; depends on T009.
- [ ] T012 [US3] Extend `tests/integration/holidays/get-holidays.test.ts` with deterministic upstream-failure and unexpected-internal-failure coverage; complete when simulated non-success responses, invalid payloads, and deterministic timeout scenarios that do not call the real BrasilAPI each return HTTP `502` with `{ "success": false, "error": { "code": "HOLIDAYS_API_UNAVAILABLE", "message": "Holidays API unavailable" } }`, the timeout assertions prove the provider/client enforces the fixed 5000 ms `AbortController` timeout path, an injected unexpected failure returns `{ "success": false, "error": { "code": "INTERNAL_SERVER_ERROR", "message": "Internal server error" } }`, and the assertions confirm the response body does not leak stack traces, upstream payload contents, connection details, or source file paths; depends on T009.

---

## Phase 4: README, Quickstart, OpenAPI, And Final Verification

**Purpose**: Align executable documentation with the implemented endpoint and verify the required quality gates.

- [ ] T013 Update `specs/004-national-holiday-retrieval/contracts/holidays-retrieval.openapi.yaml` to match the implemented `GET /holidays/:year` contract; complete when the contract documents the required path parameter, the `200`, `400`, `502`, and `500` envelopes, `data` as an array, and each holiday item with only `date`, `name`, and `type`, without adding out-of-scope endpoints or parameters; depends on T009 and T012.
- [ ] T014 Update `specs/004-national-holiday-retrieval/quickstart.md` with executable validation steps for success, invalid year, upstream failure, timeout, invalid payload, and unexpected internal failure; complete when a reviewer can follow the documented commands or targeted test runs to exercise every in-scope holidays scenario without live BrasilAPI access or undocumented setup steps; depends on T010, T011, T012, and T013.
- [ ] T015 [P] Update `README.md` to document `GET /holidays/:year` alongside the existing endpoints; complete when the README describes the path parameter, success response, `VALIDATION_ERROR`, `HOLIDAYS_API_UNAVAILABLE`, and `INTERNAL_SERVER_ERROR` responses, the relevant HTTP status codes, the standardized success/error envelopes, and explicitly preserves the current trip-request endpoint documentation instead of redefining those behaviors; depends on T013.
- [ ] T016 Validate the holidays feature against the scripts declared in `package.json`; complete when `npm run build`, `npm run lint`, and `npm test` pass with the new holidays coverage, the final verification confirms no test or runtime path calls the real BrasilAPI service, and no regressions appear in `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, or `PATCH /trip-requests/:id/cancel`; depends on T010-T015.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: Starts immediately and defines the shared holidays contract used by every later phase.
- **Phase 2**: Starts after Phase 1 and delivers the production `GET /holidays/:year` flow through validation, service, controller, router, and app wiring.
- **Phase 3**: Starts after Phase 2 so the endpoint exists for end-to-end integration verification.
- **Phase 4**: Starts after behavior and tests are stable enough to align documentation and run final quality gates.

### User Story Dependencies

- **US1**: Depends on Phase 1 and Phase 2, then reaches independent verification through T010.
- **US2**: Depends on the same shared route from Phase 2 and adds validation-path verification in T011.
- **US3**: Depends on the same shared route from Phase 2 and adds deterministic upstream-failure and internal-failure verification in T012.

### Within The Feature

- Tighten the provider contract before adding validation and routing.
- Validate the `year` path parameter before calling the holidays provider.
- Add the service before the controller, and the controller before route registration and app wiring.
- Keep all existing trip-request routes unchanged while extending shared files.
- Finish the OpenAPI contract before final README and quickstart alignment.

### Parallel Opportunities

- T003 can run in parallel with T004 after T001 because response mapping and path validation touch different files.
- T014 and T015 can run in parallel after T013 because quickstart and README updates touch different documentation files.

---

## Parallel Example

```bash
Task: "T003 Create src/responses/holiday-response-mapper.ts"
Task: "T004 Create src/validation/holiday-schemas.ts"
```

```bash
Task: "T014 Update specs/004-national-holiday-retrieval/quickstart.md"
Task: "T015 Update README.md"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete T010 and validate the successful `GET /holidays/:year` flow independently.
4. Stop for MVP review before expanding verification to invalid-year and upstream-failure scenarios.

### Incremental Delivery

1. Tighten the shared holidays provider and response type.
2. Add validation, service, controller, route, and app wiring for `GET /holidays/:year`.
3. Verify success behavior first, then invalid-year rejection, then upstream/internal failure handling.
4. Align the OpenAPI contract, quickstart, and README.
5. Run final build, lint, and test verification.

### Guardrails

- Do not modify the behavior of `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, or `PATCH /trip-requests/:id/cancel` beyond safe shared-file wiring required for the new holidays route.
- Do not implement holiday persistence, holiday caching, authentication, authorization, frontend work, reports, or extra endpoints.
- Reuse the existing Express app factory, centralized error handling, standardized envelopes, `HOLIDAYS_API_BASE_URL`, and dependency-injection patterns throughout the implementation.
