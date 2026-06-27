# Tasks: Trip Request Cancellation

**Input**: Design documents from `/specs/003-trip-request-cancellation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/trip-request-cancellation.openapi.yaml`, `quickstart.md`

**Tests**: PostgreSQL-backed Vitest integration tests are mandatory for the cancellation success path, `404`, `409`, and unexpected repository-failure behavior.

**Organization**: Tasks follow the four implementation phases requested for this feature while keeping `US1`, `US2`, and `US3` labels on story-specific verification work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`)
- Every task includes an exact file path, an observable completion condition, and dependency notes when needed

## Phase 1: Repository Contract And Prisma Cancellation Method

**Purpose**: Extend the existing repository abstraction and Prisma implementation without changing `POST /trip-requests`, `GET /trip-requests`, or `GET /trip-requests/:id`.

- [X] T001 Extend `src/repositories/trip-request-repository.ts` with `cancelById(id: string): Promise<TripRequest>`; complete when the interface exposes `create()`, `findAll()`, `findById()`, and `cancelById()` with the existing read/create signatures unchanged; blocks T002-T015.
- [X] T002 Implement `cancelById()` in `src/repositories/prisma-trip-request-repository.ts` by reusing the existing persisted-record mapper and updating only `status`; complete when the method persists `status: "canceled"`, leaves all other columns untouched, returns `departureAt`, `returnAt`, and `createdAt` in the full `YYYY-MM-DDTHH:mm:ss.sssZ` shape matching `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$`, does not delete the row, and keeps `create()`, `findAll()`, and `findById()` behavior unchanged; depends on T001.

---

## Phase 2: Cancellation Service, Controller, And Route

**Purpose**: Add the cancellation orchestration to the existing Express architecture, centralized error handling, and standardized response helpers.

- [X] T003 Extend `src/errors/app-error.ts` with `TRIP_REQUEST_ALREADY_CANCELED` and a dedicated helper for the `409 Conflict` business-rule error; complete when repeated cancellation attempts can raise a centralized application error with code `TRIP_REQUEST_ALREADY_CANCELED` and message `Trip request is already canceled`; depends on T002.
- [X] T004 Create `src/services/cancel-trip-request-service.ts` to call `tripRequestRepository.findById(id)` before `tripRequestRepository.cancelById(id)`; complete when the service returns the updated trip request for pending records, throws `TRIP_REQUEST_NOT_FOUND` for missing ids, throws `TRIP_REQUEST_ALREADY_CANCELED` for canceled records, performs no holiday-provider calls, and lets unexpected repository failures reach the centralized error handler unchanged; depends on T002 and T003.
- [X] T005 Create `src/controllers/cancel-trip-request-controller.ts` by following the existing controller pattern and reusing `sendSuccessResponse()` plus `mapTripRequestToResponse()`; complete when the controller reads `request.params.id`, returns HTTP `200` with `{ "success": true, "data": ... }` for successful cancellation, and delegates `404`, `409`, and `500` formatting to `errorHandler`; depends on T004.
- [X] T006 Update `src/routes/trip-request.routes.ts` to add `cancelTripRequestController` to the router dependencies and register `PATCH /trip-requests/:id/cancel`; complete when the router exposes `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, and `PATCH /trip-requests/:id/cancel` only, with no behavior changes to the existing endpoints; depends on T005.
- [X] T007 Update `src/app.ts` to compose `createCancelTripRequestService()` and `createCancelTripRequestController()` into the existing application factory; complete when `createApp()` wires the cancellation flow through the shared repository dependency, keeps centralized error handling intact, and leaves the current creation and retrieval composition unchanged; depends on T005 and T006.

---

## Phase 3: Integration Tests For Success, 404, 409, And Repository Failure

**Purpose**: Verify the implemented cancellation flow end-to-end with PostgreSQL-backed Vitest tests and an injected repository failure path.

**Independent Test Criteria**

- **US1**: `PATCH /trip-requests/:id/cancel` against an existing pending PostgreSQL row returns HTTP `200`, the standard success envelope, `status: "canceled"`, unchanged non-status fields, a still-persisted record, and `departureAt`, `returnAt`, and `createdAt` values that match the full timestamp regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$`.
- **US2**: `PATCH /trip-requests/:id/cancel` against a missing id returns HTTP `404` with `TRIP_REQUEST_NOT_FOUND`, and against an already canceled row returns HTTP `409` with `TRIP_REQUEST_ALREADY_CANCELED`, without mutating persisted data.
- **US3**: `PATCH /trip-requests/:id/cancel` with an injected repository failure returns HTTP `500` with `INTERNAL_SERVER_ERROR` and no leaked stack traces, Prisma details, SQL fragments, connection details, local file paths, source file paths, or `node_modules` paths.

- [X] T008 [P] Extend `tests/helpers/database.ts` with cancellation-specific fixture and assertion helpers for pending and canceled trip requests; complete when the helper can seed the cancel scenarios, reload a persisted row after the PATCH request, and support assertions that only `status` changed; depends on T002.
- [X] T009 [US1] Create `tests/integration/trip-requests/cancel-trip-request.test.ts` coverage for successful cancellation of an existing pending request; complete when the test suite proves HTTP `200`, the standardized success envelope, `status: "canceled"`, persisted status change, record survival, unchanged `requesterName`/`origin`/`destination`/`departureAt`/`returnAt`/`purpose`/`passengerCount`/`createdAt`, and full timestamp-shape assertions for `departureAt`, `returnAt`, and `createdAt` matching `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$` using PostgreSQL fixtures; depends on T007 and T008.
- [X] T010 [US2] Extend `tests/integration/trip-requests/cancel-trip-request.test.ts` with missing-id and already-canceled scenarios; complete when the suite proves HTTP `404` with `TRIP_REQUEST_NOT_FOUND`, HTTP `409` with `TRIP_REQUEST_ALREADY_CANCELED`, standardized error envelopes for both cases, and unchanged persisted data after the repeated-cancellation attempt; depends on T007 and T008.
- [X] T011 [US3] Extend `tests/integration/trip-requests/cancel-trip-request.test.ts` with unexpected repository-failure coverage through `createApp()` and a throwing repository double; complete when the suite proves HTTP `500` with `{ "success": false, "error": { "code": "INTERNAL_SERVER_ERROR", "message": "Internal server error" } }` and confirms that the response body does not expose stack traces, Prisma details, SQL fragments, connection details, local file paths, source file paths, or `node_modules` paths; depends on T007.

---

## Phase 4: README, Quickstart, OpenAPI, And Final Verification

**Purpose**: Align executable documentation with the implemented cancel endpoint and verify the affected quality gates.

- [X] T012 Update `specs/003-trip-request-cancellation/contracts/trip-request-cancellation.openapi.yaml` to match the implemented `PATCH /trip-requests/:id/cancel` behavior; complete when the contract documents the `200`, `404`, `409`, and `500` envelopes, the canonical trip-request response fields, and no out-of-scope endpoints or parameters; depends on T007 and T011.
- [X] T013 Update `specs/003-trip-request-cancellation/quickstart.md` with executable validation steps for successful cancellation, missing id, repeated cancellation, persisted-row verification, and repository-failure behavior; complete when a reviewer can follow the commands to exercise every in-scope cancellation scenario without relying on undocumented steps, including verification of the exact `{ "success": false, "error": { "code": "INTERNAL_SERVER_ERROR", "message": "Internal server error" } }` response and the absence of stack traces, Prisma details, SQL fragments, connection details, local file paths, source file paths, and `node_modules` paths; depends on T009, T010, T011, and T012.
- [X] T014 Update `README.md` to document `PATCH /trip-requests/:id/cancel` alongside the existing trip-request endpoints; complete when the README describes the route, success response, `TRIP_REQUEST_NOT_FOUND`, `TRIP_REQUEST_ALREADY_CANCELED`, and `{ "success": false, "error": { "code": "INTERNAL_SERVER_ERROR", "message": "Internal server error" } }` responses, the relevant HTTP status codes, the standardized success and error envelopes, and preserves the existing `POST` and `GET` endpoint documentation instead of redefining them; depends on T012.
- [X] T015 Validate the cancellation feature against the scripts declared in `package.json`; complete when `npm run build`, `npm run lint`, and `npm test` pass with the new cancellation coverage, the final verification confirms the exact `{ "success": false, "error": { "code": "INTERNAL_SERVER_ERROR", "message": "Internal server error" } }` response plus the absence of stack traces, Prisma details, SQL fragments, connection details, local file paths, source file paths, and `node_modules` paths, and no regressions appear in `POST /trip-requests`, `GET /trip-requests`, or `GET /trip-requests/:id`; depends on T009-T014.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: Starts immediately and blocks every later phase because the cancellation repository contract is the shared foundation.
- **Phase 2**: Starts after Phase 1 and delivers the production cancellation flow through the existing service-controller-router-app chain.
- **Phase 3**: Starts after Phase 2 so the new endpoint exists for PostgreSQL-backed integration coverage.
- **Phase 4**: Starts after the cancellation behavior and tests are stable.

### User Story Dependencies

- **US1**: Depends on Phase 1 and Phase 2, then reaches independent verification through T009.
- **US2**: Depends on the same shared cancellation flow from Phase 2 and adds invalid-target verification in T010.
- **US3**: Depends on the same shared cancellation flow from Phase 2 and adds deterministic repository-failure verification in T011.

### Within The Feature

- Implement repository support before adding service logic.
- Add the service before the controller, and the controller before the route and app wiring.
- Keep all existing `POST` and `GET` behavior unchanged while extending shared files.
- Finish the OpenAPI contract before final README and quickstart alignment.

### Parallel Opportunities

- T008 can run in parallel with T003 after T002 because the test helper change does not conflict with centralized error work.
- T013 and T014 can run in parallel after T012 because quickstart and README updates touch different documentation files.

---

## Parallel Example

```bash
Task: "T003 Extend src/errors/app-error.ts with TRIP_REQUEST_ALREADY_CANCELED support"
Task: "T008 Extend tests/helpers/database.ts with cancellation-specific fixture helpers"
```

```bash
Task: "T013 Update specs/003-trip-request-cancellation/quickstart.md"
Task: "T014 Update README.md"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete T009 and validate the successful cancellation flow independently.
4. Stop for MVP review before expanding verification to invalid-target and failure scenarios.

### Incremental Delivery

1. Add repository cancellation support.
2. Add service, controller, route, and app wiring for `PATCH /trip-requests/:id/cancel`.
3. Verify success behavior first, then invalid-target behavior, then failure handling.
4. Align contract and documentation.
5. Run final build, lint, and test verification.

### Guardrails

- Do not modify `POST /trip-requests`, `GET /trip-requests`, or `GET /trip-requests/:id` behavior beyond safe shared-file wiring.
- Do not implement `GET /holidays/:year`, authentication, authorization, approval flow, vehicle allocation, driver allocation, reports, frontend work, or any new product scope.
- Reuse the existing Express architecture, centralized error handling, success/error envelopes, repository abstraction, Prisma repository, and trip request response mapper throughout the implementation.
