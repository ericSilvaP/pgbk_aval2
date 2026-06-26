# Tasks: Complete Trip Request Creation

**Input**: Design documents from `/specs/001-trip-request-creation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are mandatory for this feature. Include Vitest + Supertest coverage for successful creation, local validation, holiday validation, provider failure, repository failure, no-persistence guarantees, and standardized envelopes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend API only**: `src/`, `tests/`, and database setup files at repository root
- **No frontend/mobile paths**: frontend, mobile UI, authentication, authorization, user management, approvals, vehicle/driver allocation, check-in/check-out, mileage control, and administrative reports are out of scope
- Paths shown below match the backend API structure from `plan.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the project structure and test harness entry points needed for the feature

- [X] T001 Create setup-only directory scaffolding for the feature in `src/providers/` and `tests/integration/trip-requests/`, with completion confirmed when later tasks can add concrete provider and test files without creating new directories.
- [X] T002 [P] Create the PostgreSQL test helper scaffold in `tests/helpers/database.ts`, with completion confirmed when the file exports placeholder setup/cleanup helpers that can be imported by integration tests.
- [X] T003 [P] Create the trip request integration test file scaffold in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the file exists and can host the full HTTP test suite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared infrastructure that every user story depends on before story-specific implementation begins

**⚠️ CRITICAL**: No user story work should begin until this phase is complete

- [X] T004 [P] Create the trip request repository contract in `src/repositories/trip-request-repository.ts`, with completion confirmed when the creation flow can import a typed repository abstraction from that file.
- [X] T005 [P] Create the holidays provider contract in `src/providers/holidays-provider.ts`, with completion confirmed when the creation flow can import a typed `HolidaysProvider` abstraction from that file.
- [X] T006 Create the application factory with injectable repository and holidays-provider dependencies in `src/app.ts`, with completion confirmed when the app can be instantiated with custom test doubles that satisfy `T004` and `T005`.
- [X] T007 [P] Create the trip request request schema and shared validation helpers in `src/validation/trip-request-schemas.ts`, with completion confirmed when controllers and services can import the request contract from that file.
- [X] T008 [P] Create the trip request response mapper and standardized success helper in `src/responses/trip-request-response-mapper.ts` and `src/responses/send-success-response.ts`, with completion confirmed when successful creation responses can be shaped through those files only.
- [X] T009 Create the Prisma-backed trip request repository in `src/repositories/prisma-trip-request-repository.ts`, with completion confirmed when the repository contract from `T004` is implemented against PostgreSQL persistence.
- [X] T010 Create the BrasilAPI-backed holidays provider in `src/providers/brasil-api-holidays-provider.ts`, with completion confirmed when the provider contract from `T005` is implemented using `HOLIDAYS_API_BASE_URL`.
- [X] T011 Create the create-trip-request controller in `src/controllers/create-trip-request-controller.ts`, with completion confirmed when the controller delegates request handling without embedding direct persistence or provider calls.
- [X] T012 Register the trip request route and production dependency wiring in `src/routes/trip-request.routes.ts`, `src/routes/index.ts`, `src/index.ts`, and `src/server.ts`, with completion confirmed when `POST /trip-requests` resolves through the application factory.
- [X] T013 Create centralized create-flow error constructors and HTTP mappings in `src/errors/app-error.ts` and `src/errors/error-handler.ts`, with completion confirmed when validation, holiday, provider, and unexpected errors can be emitted through the centralized handler only.

**Checkpoint**: Foundation ready - user story implementation can now begin in priority order

---

## Phase 3: User Story 1 - Core trip request creation (Priority: P1) 🎯 MVP

**Goal**: Allow an API consumer to submit a valid request and receive a persisted trip request with server-generated fields, `pending` status, UTC-normalized dates, and standardized envelopes

**Independent Test**: Send a valid `POST /trip-requests` request and verify HTTP `201`, success envelope, generated `id` and `createdAt`, `pending` status, UTC timestamps, matching PostgreSQL persistence, and centralized `INTERNAL_SERVER_ERROR` behavior on repository failure

### Tests for User Story 1 (MANDATORY) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T014 [US1] Add the successful creation HTTP test with persistence verification in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the test asserts HTTP `201`, the standard success envelope, generated `id`/`createdAt`, `pending` status, UTC timestamps, and a persisted PostgreSQL row.
- [ ] T015 [US1] Add the client-managed field rejection HTTP test for `id`, `status`, and `createdAt` in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the test asserts HTTP `400`, `success: false`, `VALIDATION_ERROR`, an English error message, zero holidays-provider calls, zero repository create calls, and no persisted record.
- [ ] T016 [US1] Add the app-level HTTP repository failure test using an injected throwing repository in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the test asserts HTTP `500`, `INTERNAL_SERVER_ERROR`, the standard error envelope, and no leaked internal details.

### Implementation for User Story 1

- [ ] T017 [P] [US1] Implement server-managed field rejection in `src/validation/trip-request-schemas.ts`, with completion confirmed when `id`, `status`, and `createdAt` are rejected before the service proceeds.
- [ ] T018 [P] [US1] Implement successful trip request response mapping in `src/responses/trip-request-response-mapper.ts` and `src/responses/send-success-response.ts`, with completion confirmed when successful responses are produced exclusively through those helpers.
- [ ] T019 [US1] Implement the core create-trip-request success flow with repository persistence and `pending` status in `src/services/create-trip-request-service.ts`, with completion confirmed when valid non-holiday input reaches persistence and returns the created trip request model.
- [ ] T020 [US1] Connect the controller and route to the successful creation flow in `src/controllers/create-trip-request-controller.ts`, `src/routes/trip-request.routes.ts`, and `src/app.ts`, with completion confirmed when `POST /trip-requests` resolves through the controller-service-repository chain.
- [ ] T021 [US1] Implement PostgreSQL cleanup and created-record assertions in `tests/helpers/database.ts` and `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the US1 tests can verify durable persistence and clean state between runs.

**Checkpoint**: User Story 1 should be fully functional and independently testable

---

## Phase 4: User Story 2 - Manual business validation (Priority: P2)

**Goal**: Reject invalid local input before any holidays-provider or repository access, with `VALIDATION_ERROR` and no persistence side effects

**Independent Test**: Submit requests with missing required fields, invalid field types, invalid date-time values, `returnAt` before `departureAt`, `returnAt` equal to `departureAt`, and `passengerCount <= 0`; verify HTTP `400` or continued eligibility, no holidays-provider call on rejected inputs, no repository create call on rejected inputs, and no persisted record

### Tests for User Story 2 (MANDATORY) ⚠️

- [ ] T022 [US2] Add parameterized HTTP tests for missing required properties in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the suite covers missing `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, and `passengerCount` and asserts HTTP `400`, `success: false`, `VALIDATION_ERROR`, an English error message, zero holidays-provider calls, zero repository create calls, and no persisted record for each case.
- [ ] T023 [US2] Add parameterized HTTP tests for invalid field types in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the suite covers non-string `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, and non-number `passengerCount` and asserts HTTP `400`, `success: false`, `VALIDATION_ERROR`, zero holidays-provider calls, zero repository create calls, and no persisted record for each case.
- [ ] T024 [US2] Add HTTP tests for invalid date-time values in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when invalid `departureAt` and invalid `returnAt` inputs both assert HTTP `400`, `VALIDATION_ERROR`, zero holidays-provider calls, zero repository create calls, and no persisted record.
- [ ] T025 [US2] Add HTTP tests for `returnAt` after, equal to, and before `departureAt` in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the suite proves after/equal values may continue and before values return HTTP `400` with no provider or repository create call.
- [ ] T026 [US2] Add HTTP tests for `passengerCount` equal to zero and below zero in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when both cases assert HTTP `400`, `VALIDATION_ERROR`, zero holidays-provider calls, zero repository create calls, and no persisted record.

### Implementation for User Story 2

- [ ] T027 [US2] Implement date-time parsing and UTC normalization helpers in `src/services/create-trip-request-service.ts`, with completion confirmed when the service can convert valid request date-time values into normalized UTC values before any holiday check.
- [ ] T028 [US2] Implement `returnAt >= departureAt` and `passengerCount > 0` validation rules in `src/services/create-trip-request-service.ts`, with completion confirmed when invalid ordering and passenger counts raise `VALIDATION_ERROR` before any provider or repository create call.
- [ ] T029 [US2] Enforce local-validation short-circuiting before holidays-provider and repository calls in `src/services/create-trip-request-service.ts`, with completion confirmed when all US2 rejection paths avoid both `HolidaysProvider` access and `TripRequestRepository.create`.
- [ ] T030 [US2] Add provider-call tracking and rejected-request persistence assertions in `tests/helpers/database.ts` and `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when US2 tests can observe zero provider calls, zero repository create calls, and zero new database rows for rejected cases.

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - National holiday validation (Priority: P3)

**Goal**: Validate the normalized departure civil date against a replaceable holidays provider and reject holiday or provider-failure cases before persistence

**Independent Test**: Submit locally valid requests for a national holiday, a holidays-provider failure, and a non-holiday departure; verify HTTP `409`, `502`, or `201` respectively, and verify no persistence on rejected cases without calling the real BrasilAPI

### Tests for User Story 3 (MANDATORY) ⚠️

- [ ] T031 [US3] Add the national holiday rejection HTTP test in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the test asserts HTTP `409`, `HOLIDAY_TRIP_NOT_ALLOWED`, zero persisted rows, and the standard error envelope.
- [ ] T032 [US3] Add the holidays-provider failure HTTP test in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the test asserts HTTP `502`, `HOLIDAYS_API_UNAVAILABLE`, zero persisted rows, and the standard error envelope.
- [ ] T033 [US3] Add the no-real-BrasilAPI and no-persistence holiday-flow assertions in `tests/integration/trip-requests/create-trip-request.test.ts`, with completion confirmed when the suite proves provider doubles are used exclusively and rejected holiday flows leave no database record.

### Implementation for User Story 3

- [ ] T034 [US3] Implement departure year and `YYYY-MM-DD` civil-date extraction in `src/services/create-trip-request-service.ts`, with completion confirmed when holiday lookup uses the normalized departure year and civil date only.
- [ ] T035 [US3] Implement holiday matching and provider-failure error translation in `src/services/create-trip-request-service.ts`, with completion confirmed when holiday matches return `HOLIDAY_TRIP_NOT_ALLOWED` and provider failures return `HOLIDAYS_API_UNAVAILABLE` before persistence.
- [ ] T036 [US3] Wire the production holidays provider through the application factory and route stack in `src/app.ts`, `src/providers/brasil-api-holidays-provider.ts`, and `src/routes/trip-request.routes.ts`, with completion confirmed when production wiring resolves a `HolidaysProvider` without introducing direct route-level external calls.
- [ ] T037 [US3] Add holiday-provider test doubles and no-persistence assertions in `tests/integration/trip-requests/create-trip-request.test.ts` and `tests/helpers/database.ts`, with completion confirmed when US3 tests can control provider outcomes and verify no row is written on rejected holiday flows.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, contracts, and verification for the complete release-ready flow

- [ ] T038 [P] Update the `POST /trip-requests` HTTP contract examples and error responses in `specs/001-trip-request-creation/contracts/post-trip-requests.openapi.yaml`, with completion confirmed when the contract documents success, validation, holiday, provider-failure, and repository-failure responses consistently with the implementation plan.
- [ ] T039 [P] Update the end-to-end validation guide in `specs/001-trip-request-creation/quickstart.md`, with completion confirmed when the guide documents success, manual validation, holiday rejection, provider failure, and repository failure scenarios.
- [ ] T040 [P] Update the setup, environment, and endpoint documentation in `README.md`, with completion confirmed when the README documents the complete `POST /trip-requests` flow, required environment variables, and test isolation expectations.
- [ ] T041 Verify holiday-provider configuration and database bootstrap documentation in `.env.example` and `docker-compose.yml`, with completion confirmed when the documented defaults still support the described local setup for the complete feature.
- [ ] T042 Run and document the final quality-gate validation across `npm run build`, `npm test`, and `npm run lint` in `specs/001-trip-request-creation/quickstart.md`, with completion confirmed when the quickstart records the final verification commands for the release-ready flow.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion - no dependency on later stories
- **User Story 2 (Phase 4)**: Depends on Foundational completion and extends the creation flow with mandatory local validation
- **User Story 3 (Phase 5)**: Depends on Foundational completion and builds on the validated creation flow with holiday-provider behavior
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: First deliverable and MVP; establishes the core create route, persistence, envelopes, and repository-failure handling
- **User Story 2 (P2)**: Depends on the creation flow from US1 and adds mandatory local business validation before any external dependency or persistence use
- **User Story 3 (P3)**: Depends on the validated flow from US2 and adds mandatory holiday-provider validation before persistence

### Within Each User Story

- Tests MUST be written and fail before implementation
- Validation and response mapping should land before final controller/route completion
- Service logic should be completed before finalizing integration assertions
- No-persistence assertions must pass before the story is considered complete

### Parallel Opportunities

- `T002` and `T003` can run in parallel after `T001`
- `T004` and `T005` can run in parallel during Foundation
- `T007` and `T008` can run in parallel during Foundation after `T006`
- `T017` and `T018` can run in parallel for User Story 1
- `T038`, `T039`, and `T040` can run in parallel during Polish

---

## Parallel Example: User Story 1

```bash
# Launch the User Story 1 implementation helpers together:
Task: "Implement server-managed field rejection in src/validation/trip-request-schemas.ts"
Task: "Implement successful trip request response mapping in src/responses/trip-request-response-mapper.ts and src/responses/send-success-response.ts"

# Launch the Polish documentation tasks together:
Task: "Update the POST /trip-requests HTTP contract examples and error responses in specs/001-trip-request-creation/contracts/post-trip-requests.openapi.yaml"
Task: "Update the end-to-end validation guide in specs/001-trip-request-creation/quickstart.md"
Task: "Update the setup, environment, and endpoint documentation in README.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the `POST /trip-requests` success and repository-failure HTTP tests with PostgreSQL persistence checks
5. Demo the MVP before layering in the mandatory business validations

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Validate success and centralized failure behavior
3. Add User Story 2 → Test independently → Validate all local business rules and short-circuit behavior
4. Add User Story 3 → Test independently → Validate holiday-provider behavior without the real BrasilAPI
5. Finish Polish → Validate documentation, contracts, and quality gates

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Documentation and final verification proceed after all three stories are complete

---

## Notes

- [P] tasks indicate different files with no direct dependency on unfinished same-story work
- Every task includes an exact file path and an observable completion condition
- The task set includes all mandatory creation validations and leaves none deferred to another feature
- Tests must never access the real BrasilAPI
- Authentication, authorization, frontend, vehicle allocation, driver allocation, approvals, and other out-of-scope functionality remain excluded
