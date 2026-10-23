# Task Routing

`P` = `C:\Users\DELL\documents\pau\ailo-planning` (outside the repo).

| Stage | Reads | Writes |
|-------|-------|--------|
| 02-prd | frozen | `stages/02-prd/output/prd.md` (only on the user's explicit say-so) |
| 03-build | PRD sections 5-9, `P/research/build-stack.md`, `P/research/kora-and-protocols.md`, `P/research/production-precedents.md`, `P/context/rules-and-clock.md` | `stages/03-build/output/agent-prompts.md`, `hour-plan.md` |
| 04-pitch | PRD, `P/context/rubric-and-judging.md`, `P/context/judges.md`, `P/mock-judging/*`, team status | `stages/04-pitch/output/deck-outline.md`, `pitch-script.md`, `qa-prep.md` |

Judging, research and gap reviews are written to `P/`, never into this repo.

## Checkpoints

- Before 2 PM: the team approves PRD scope (section 6) and workstream owners (section 14).
- 7 PM: one real Kora sandbox payment end to end. If not, follow the PRD cut order.
- 12 PM Saturday: freeze. Only pitch work after this.
