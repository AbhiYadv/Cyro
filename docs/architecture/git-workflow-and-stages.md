# Git Workflow and Stages

## Branch Stages

- `dev`: active integration branch. All approved work lands here first.
- `qa`: receives validated batches from dev.
- `uat`: receives release candidates from qa.
- `prod`: stable production only.

## Task Branching

- Start every task from `dev`.
- Create task branch: `task/CYRO-0001-short-name`.
- No direct work on `qa`, `uat`, or `prod`.
- No direct push to `prod`.
- No merge to `dev` until task scores 10/10.

## Required Pre-Task Commands

```bash
git status --short
git branch --show-current
git log -1 --oneline
```

If workspace is dirty with unknown changes, stop and report.

## Dirty Workspace Prevention

- Do not delete unknown files.
- Do not run `git clean -fdx` without explicit approval.
- Create backup branch before risky cleanup.
- Do not reformat unrelated files.
- Do not change generated artifacts unless required.

## Promotion Flow

feature branch → review 10/10 → dev → qa → uat → prod

No next task starts until current task is cleanly merged or explicitly parked.
