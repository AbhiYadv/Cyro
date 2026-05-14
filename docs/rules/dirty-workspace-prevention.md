# Dirty Workspace Prevention

Before every task:
```bash
git status --short
git branch --show-current
git log -1 --oneline
```

Stop if:
- unknown dirty files exist
- branch is not expected
- previous task is not reviewed
- destructive cleanup seems needed

Never:
- delete unknown files
- run `git clean -fdx` without approval
- reformat unrelated files
- start next task before current task is 10/10
