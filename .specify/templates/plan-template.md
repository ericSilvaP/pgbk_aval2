# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript with Node.js 20 or higher; `strict: true` required

**Primary Dependencies**: HTTP framework of choice, BrasilAPI integration, database access library documented in README

**Storage**: Real SGBD executed by Docker Compose; no memory-only persistence

**Testing**: Vitest via the `test` script; holiday integration must be replaceable by mock/stub/fake/test server

**Target Platform**: Backend REST API only

**Project Type**: Single backend API project; frontend is out of scope

**Performance Goals**: Reliable CRUD-style API behavior for institutional trip requests; no additional performance goals unless specified

**Constraints**: Mandatory REST contract, standardized response envelopes, centralized error handling, UTC date normalization, reproducible database initialization, no auth/approval/vehicle/driver/check-in/check-out/reports/frontend features

**Scale/Scope**: `trip-requests` resource plus national holiday lookup only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] Scope remains backend-only; no frontend, authentication, authorization, users, approvals, vehicles, drivers, check-in, check-out, mileage control, or administrative reports.
- [ ] Required endpoints are preserved: `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, `PATCH /trip-requests/:id/cancel`, `GET /holidays/:year`.
- [ ] `trip-requests` fields include at least `id`, `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, `status`, and `createdAt`.
- [ ] Success and error responses use the mandatory envelopes exactly, with English UPPER_SNAKE_CASE internal error codes.
- [ ] Centralized error handling maps validation, not found, already canceled, holiday conflict, external API failure, and unexpected errors to the required HTTP statuses.
- [ ] Creation validates all required fields, types, date formats, `returnAt >= departureAt`, `passengerCount > 0`, and non-holiday departure before persistence.
- [ ] `departureAt`, `returnAt`, and `createdAt` are received, stored, and returned as complete UTC ISO 8601 timestamps.
- [ ] Holidays come only from BrasilAPI using `HOLIDAYS_API_BASE_URL`; no hardcoded, manual, or seed-loaded holiday lists.
- [ ] BrasilAPI access is isolated behind a replaceable client/service and can be mocked in tests.
- [ ] Database access is isolated behind persistence components and uses a real SGBD from `docker-compose.yml`.
- [ ] `init:db`, `.env.example`, `DATABASE_URL`, and `HOLIDAYS_API_BASE_URL` are reproducible and compatible with Docker Compose.
- [ ] Vitest coverage includes the mandatory success, validation, holiday, not-found, and cancelation scenarios.
- [ ] README changes are planned when setup, scripts, endpoints, or behavior change.
- [ ] Technical identifiers, files, scripts, database objects, tests, logs, comments, and commit messages remain in English.
- [ ] A Git checkpoint exists before extensive AI-generated changes.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app.ts
├── server.ts
├── config/
├── routes/
├── controllers/
├── services/
├── repositories/
├── integrations/
├── errors/
├── responses/
└── validation/

tests/
├── contract/
├── integration/
└── unit/

prisma/ or database/
├── schema/migrations
└── seed/init scripts

.specify/
└── [planning artifacts]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
