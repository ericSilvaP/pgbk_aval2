# Tasks: Trip Request Retrieval

**Input**: Design documents from `/specs/002-trip-request-retrieval/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/trip-requests-retrieval.openapi.yaml`, `quickstart.md`

**Tests**: Integration tests with PostgreSQL are mandatory for both retrieval endpoints, plus injected repository-failure coverage through the existing app factory.

**Organization**: Tasks are grouped into the four implementation phases requested for this feature and map Phase 2 to User Story 1 (`GET /trip-requests`) and Phase 3 to User Story 2 (`GET /trip-requests/:id`).

## Phase 1: Repository Contracts And Prisma Repository Methods

**Purpose**: Extend the existing repository abstraction and Prisma implementation without changing `POST /trip-requests` behavior.

- [X] T001 Extend `src/repositories/trip-request-repository.ts` with `findAll(): Promise<TripRequest[]>` and `findById(id: string): Promise<TripRequest | null>`; complete when the contract exports both read methods and remains backward-compatible with `create()`; blocks T002-T014.
- [X] T002 Implement `findAll()` and `findById()` in `src/repositories/prisma-trip-request-repository.ts` using Prisma reads plus `toISOString()` normalization; complete when list and single-record reads return canonical trip-request fields with `departureAt`, `returnAt`, and `createdAt` ending in `Z`, and `create()` behavior stays unchanged; depends on T001.

---

## Phase 2: User Story 1 - List Persisted Trip Requests (Priority: P1) 🎯 MVP

**Goal**: Deliver `GET /trip-requests` with the standard success envelope for empty and populated datasets, while preserving centralized `500` handling for unexpected repository failures and keeping the collection contract explicitly unordered.

**Independent Test**: Call `GET /trip-requests` against an empty PostgreSQL dataset and a seeded PostgreSQL dataset, then verify `200 OK`, `{ "success": true, "data": [...] }`, canonical field names, UTC date strings ending with `Z`, and list contents with order-insensitive assertions because the API does not guarantee collection order.

### Tests for User Story 1 (MANDATORY) ⚠️

- [ ] T003 [P] [US1] Create `tests/integration/trip-requests/list-trip-requests.test.ts` covering the empty list case, the persisted-records case, UTC `Z` date serialization, order-insensitive list-content assertions, and a repository-failure response with `INTERNAL_SERVER_ERROR` and no leaked internal detail; complete when the new tests fail before implementation, exercise PostgreSQL for success paths, and avoid relying on response ordering; depends on T002.
- [ ] T004 [P] [US1] Extend `tests/helpers/database.ts` with deterministic trip-request fixture helpers for list retrieval setup and cleanup; complete when the helper can seed list scenarios for `tests/integration/trip-requests/list-trip-requests.test.ts` without bypassing PostgreSQL; depends on T002.

### Implementation for User Story 1

- [ ] T005 [US1] Implement `src/services/list-trip-requests-service.ts` to return `tripRequestRepository.findAll()` results for controller serialization reuse; complete when the service performs no holiday-provider calls, does not add sorting, filtering, or pagination, and lets unexpected repository failures reach centralized error handling; depends on T002.
- [ ] T006 [US1] Implement `src/controllers/list-trip-requests-controller.ts` to call the list service and respond through `sendSuccessResponse()` plus `mapTripRequestToResponse()`; complete when the handler returns HTTP `200` with `{ "success": true, "data": TripRequestResponse[] }`; depends on T005.
- [ ] T007 [US1] Register `GET /trip-requests` in `src/routes/trip-request.routes.ts`; complete when the router exposes the existing `POST /trip-requests` route plus the new collection `GET /trip-requests` route and adds no pagination, filtering, or sorting behavior; depends on T006.
- [ ] T008 [US1] Wire the list retrieval service and controller into `src/app.ts`; complete when `createApp()` composes `listTripRequests` alongside the existing create flow without changing `POST /trip-requests` behavior; depends on T006 and T007.

**Checkpoint**: `GET /trip-requests` is fully functional and independently testable.

---

## Phase 3: User Story 2 - Retrieve A Trip Request By Id (Priority: P2)

**Goal**: Deliver `GET /trip-requests/:id` with canonical success responses for existing records and a standardized `TRIP_REQUEST_NOT_FOUND` error for missing identifiers.

**Independent Test**: Call `GET /trip-requests/:id` with an existing identifier and a missing identifier, then verify `200 OK` or `404 Not Found`, the standard response envelope, canonical field names, and UTC date strings ending with `Z`.

### Tests for User Story 2 (MANDATORY) ⚠️

- [ ] T009 [P] [US2] Create `tests/integration/trip-requests/get-trip-request-by-id.test.ts` covering existing-record success, missing-id `404` with `TRIP_REQUEST_NOT_FOUND`, UTC `Z` date serialization, and a repository-failure response with `INTERNAL_SERVER_ERROR` and no leaked internal detail; complete when the new tests fail before implementation and use PostgreSQL fixtures for success paths; depends on T002 and T004.

### Implementation for User Story 2

- [ ] T010 [US2] Add `TRIP_REQUEST_NOT_FOUND` and a `createTripRequestNotFoundError()` helper to `src/errors/app-error.ts`; complete when missing trip requests map to HTTP `404` with message `Trip request not found`; depends on T002.
- [ ] T011 [US2] Implement `src/services/get-trip-request-by-id-service.ts` to call `tripRequestRepository.findById(id)` and throw the new not-found error when the result is `null`; complete when successful lookups return repository records unchanged for mapper reuse and missing ids never expose persistence details; depends on T002 and T010.
- [ ] T012 [US2] Implement `src/controllers/get-trip-request-by-id-controller.ts` to read `request.params.id`, call the get-by-id service, and send the standardized success envelope through the existing mapper; complete when the controller returns HTTP `200` for found records and delegates `404` and `500` formatting to `errorHandler`; depends on T011.
- [ ] T013 [US2] Register `GET /trip-requests/:id` in `src/routes/trip-request.routes.ts`; complete when the router exposes only `POST /trip-requests`, `GET /trip-requests`, and `GET /trip-requests/:id` for this feature scope; depends on T007 and T012.
- [ ] T014 [US2] Wire the get-by-id retrieval service and controller into `src/app.ts`; complete when `createApp()` composes both retrieval handlers without changing existing creation dependencies or holiday-provider behavior; depends on T008 and T013.

**Checkpoint**: `GET /trip-requests/:id` is fully functional and independently testable.

---

## Phase 4: Documentation, OpenAPI Updates, Quickstart Updates, And Final Verification

**Purpose**: Align the executable documentation with the implemented retrieval behavior and verify the affected quality gates.

- [ ] T015 Align `specs/002-trip-request-retrieval/contracts/trip-requests-retrieval.openapi.yaml` with the implemented `GET /trip-requests` and `GET /trip-requests/:id` behavior; complete when both endpoints document the `200`, `404`, and `500` envelopes, the empty-list response, and UTC `Z` timestamp examples with no out-of-scope parameters; depends on T008 and T014.
- [ ] T016 Update `specs/002-trip-request-retrieval/quickstart.md` with executable validation steps for the empty list, populated list, get-by-id success, missing id, and repository-failure scenarios; complete when every retrieval scenario can be exercised from the documented commands and expected outcomes; depends on T003, T009, and T015.
- [ ] T017 Update or verify `README.md` documentation for `GET /trip-requests` and `GET /trip-requests/:id`; complete when `README.md` documents each endpoint's method, route, behavior, success response shape, not-found response shape where applicable, relevant HTTP status codes, and examples that use the standardized success and error envelopes; depends on T015.
- [ ] T018 Validate the retrieval implementation against the scripts in `package.json`; complete when `npm run build`, `npm run lint`, and `npm test` all pass with the new retrieval coverage and no out-of-scope endpoint regressions; depends on T008, T014, T015, T016, and T017.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: Starts immediately and blocks all later work because repository reads are the shared foundation.
- **Phase 2**: Starts after Phase 1 and delivers the MVP `GET /trip-requests` endpoint.
- **Phase 3**: Can begin after Phase 1 for tests, error work, service, and controller work, but its shared-file route and app wiring tasks depend on the Phase 2 changes to `src/routes/trip-request.routes.ts` and `src/app.ts`.
- **Phase 4**: Starts after both retrieval endpoints are implemented.

### User Story Dependencies

- **US1**: Depends only on Phase 1 and is the MVP scope.
- **US2**: Depends on Phase 1; for clean merges, T013 depends on T007 and T014 depends on T008 because both stories touch the same router and app composition files.

### Within Each User Story

- Write the integration tests first and confirm they fail before implementing the endpoint.
- Complete service logic before controller logic.
- Complete controller logic before route registration and app wiring.
- Keep `POST /trip-requests` unchanged except for safe repository or helper reuse.

### Parallel Opportunities

- T003 and T004 can run in parallel after T002.
- T009 can run in parallel with T010 after Phase 1 is complete.
- T015 and T016 can be prepared in parallel once both retrieval endpoints are stable, but T016 should finish after the contract is aligned.
- T017 can proceed after T015 if endpoint documentation in `README.md` needs updates or explicit verification.

---

## Parallel Example: User Story 1

```bash
Task: "T003 Create tests/integration/trip-requests/list-trip-requests.test.ts"
Task: "T004 Extend tests/helpers/database.ts with retrieval fixtures"
```

## Parallel Example: User Story 2

```bash
Task: "T009 Create tests/integration/trip-requests/get-trip-request-by-id.test.ts"
Task: "T010 Add TRIP_REQUEST_NOT_FOUND support in src/errors/app-error.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1.
2. Complete Phase 2 and validate `GET /trip-requests` independently.
3. Stop for MVP review before moving to Phase 3.

### Incremental Delivery

1. Add repository read support in Phase 1.
2. Deliver list retrieval in Phase 2.
3. Deliver get-by-id retrieval in Phase 3.
4. Finish contract, quickstart, and verification work in Phase 4.

### Guardrails

- Do not add pagination, filtering, sorting, authentication, authorization, frontend work, or any new endpoint outside `GET /trip-requests` and `GET /trip-requests/:id`.
- The `GET /trip-requests` response is explicitly unordered; consumers and automated tests must not rely on response ordering.
- Do not change `POST /trip-requests` behavior except for safe reuse of repository, mapper, or response helpers.
- Do not implement `PATCH /trip-requests/:id/cancel` or `GET /holidays/:year` work in this feature.
