# Cyro Engineering Operating Model

## Operating Principle

Every task must be scoped, reviewed, scored, and completed before the next task starts.

## Review Gate

- Codex completes one task.
- Codex reports changed files, tests, boundaries, and risks.
- Architect/user reviews and scores out of 10.
- Only 10/10 is accepted.
- If score is below 10, issue a focused fix task.
- Do not start the next task until current work is 10/10.

## Scope Discipline

- No scope creep.
- No feature work during governance tasks.
- No provider automation.
- No unapproved new frameworks.
- No destructive cleanup.
- No hidden cloud dependencies.

## Required Codex Report

1. Scope completed
2. Current branch and workspace status
3. Files created/changed
4. Validation commands run
5. Architecture boundaries preserved
6. Risks or gaps
7. Recommended next task

## Definition of Done

A task is done only when:
- requested scope is complete
- tests/checks pass or unavailable checks are clearly reported
- docs are updated where needed
- privacy/security boundaries are preserved
- no forbidden implementation exists
- architect score is 10/10
