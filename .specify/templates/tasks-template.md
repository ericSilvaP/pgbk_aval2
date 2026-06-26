---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY for this project. Include Vitest tasks for every constitution-required scenario and for each user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend API only**: `src/`, `tests/`, and database setup files at repository root
- **No frontend/mobile paths**: frontend, mobile UI, authentication, authorization, user management, approvals, vehicle/driver allocation, check-in/check-out, mileage control, and administrative reports are out of scope
- Paths shown below assume the backend API structure from plan.md; adjust only to match real files

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Setup real SGBD schema/migrations and Docker Compose compatibility
- [ ] T005 [P] Setup API routing and middleware structure for required REST endpoints
- [ ] T006 [P] Create standardized success/error response helpers
- [ ] T007 Create centralized error types and error-handling middleware with required HTTP mappings
- [ ] T008 Create validation layer for required fields, types, dates, `passengerCount`, and holiday rules
- [ ] T009 Create persistence repository/service boundaries for `trip-requests`
- [ ] T010 Create replaceable BrasilAPI holidays client/service using `HOLIDAYS_API_BASE_URL`
- [ ] T011 Setup environment configuration with functional `.env.example` defaults
- [ ] T012 Setup Vitest utilities, isolated test data, and holiday integration test doubles

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (MANDATORY) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Contract test for [endpoint] in tests/contract/[name].test.ts
- [ ] T014 [P] [US1] Integration test for [user journey] in tests/integration/[name].test.ts

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create [Entity1] model/type in src/[location]/[entity1].ts
- [ ] T016 [P] [US1] Create [Entity2] model/type in src/[location]/[entity2].ts
- [ ] T017 [US1] Implement [Service] in src/services/[service].ts (depends on T015, T016)
- [ ] T018 [US1] Implement [endpoint/feature] in src/[location]/[file].ts
- [ ] T019 [US1] Add validation, centralized error mapping, response envelope checks, and UTC date normalization
- [ ] T020 [US1] Add persistence assertions for created/changed state and absence of persistence on invalid input

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (MANDATORY) ⚠️

- [ ] T021 [P] [US2] Contract test for [endpoint] in tests/contract/[name].test.ts
- [ ] T022 [P] [US2] Integration test for [user journey] in tests/integration/[name].test.ts

### Implementation for User Story 2

- [ ] T023 [P] [US2] Create [Entity] model/type in src/[location]/[entity].ts
- [ ] T024 [US2] Implement [Service] in src/services/[service].ts
- [ ] T025 [US2] Implement [endpoint/feature] in src/[location]/[file].ts
- [ ] T026 [US2] Integrate with prior story components only where required by the REST contract

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (MANDATORY) ⚠️

- [ ] T027 [P] [US3] Contract test for [endpoint] in tests/contract/[name].test.ts
- [ ] T028 [P] [US3] Integration test for [user journey] in tests/integration/[name].test.ts

### Implementation for User Story 3

- [ ] T029 [P] [US3] Create [Entity] model/type in src/[location]/[entity].ts
- [ ] T030 [US3] Implement [Service] in src/services/[service].ts
- [ ] T031 [US3] Implement [endpoint/feature] in src/[location]/[file].ts

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] README updates for setup, scripts, endpoints, examples, HTTP statuses, SGBD, and package manager
- [ ] TXXX Code cleanup and refactoring without adding out-of-scope architecture or features
- [ ] TXXX [P] Additional Vitest unit tests for validation, date normalization, error mapping, and holiday client behavior
- [ ] TXXX Verify `init:db` is idempotent and inserts at least 10 trip requests without creating holidays
- [ ] TXXX Run clone-clean execution validation from README/quickstart instructions
- [ ] TXXX Run quality gates: install dependencies, start database, initialize database, typecheck/build, test, start application, validate affected endpoints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for [endpoint] in tests/contract/[name].test.ts"
Task: "Integration test for [user journey] in tests/integration/[name].test.ts"

# Launch all models/types for User Story 1 together:
Task: "Create [Entity1] model/type in src/[location]/[entity1].ts"
Task: "Create [Entity2] model/type in src/[location]/[entity2].ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group using clear English commit messages
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
