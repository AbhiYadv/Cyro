# Review and Score Gates

## 10/10 Gate

Only 10/10 work moves forward.

## Score Categories

1. Architecture alignment
2. Scope discipline
3. Security/privacy boundary
4. Provider safety
5. Memory safety
6. Git/workspace hygiene
7. Test/check coverage
8. Documentation completeness
9. Maintainability
10. Risk clarity

## Automatic Fail Conditions

- Adds provider scraping/session mirroring/cookie capture.
- Adds hidden provider automation.
- Adds auto-send into GPT/Claude/Gemini.
- Updates memory silently.
- Exposes raw vault to public provider.
- Starts unscoped feature work.
- Leaves tests/checks unreported.
- Modifies unrelated files without explanation.

## Review Output

- Score: X/10
- Blocking issues
- Required fix task if score < 10
- Approval to merge/push to dev only if 10/10
