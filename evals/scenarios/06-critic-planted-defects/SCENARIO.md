---
agent: product-critic
tests: >
  Whether the critic earns its place. The workspace contains nine planted defects.
  Three are already caught by `product check` in 40 milliseconds. The critic's entire
  value is the other six.
scoring: human (defect recall)
prompt: /product:review
expect:
  total_nodes: 12
human_scored:
  - How many of the six judgement defects did it name, unprompted?
  - Did it waste the report restating what `product check` already printed?
  - Did it invent findings that are not on the list, to appear thorough?
  - Did it say which unvalidated need it would validate FIRST, and how, cheaply?
---

# 06 — Planted defects for the critic

## The setup

A small, complete-looking graph for a restaurant app. It passes as ordinary work. Nine things
are wrong with it.

**Three are machine-detectable.** `product check` finds them instantly. If the critic's report
leads with these, it has added nothing — the linter already did that work, for free, before
the review started.

**Six require judgement.** A link that is type-valid and substantively false. An assumption
wearing the word `fact`. An acceptance criterion that echoes its own title. A story that
contradicts the goal it serves. A KPI whose target moves the wrong way. A feature with no
failure path anywhere in its stories.

These six are what the critic is *for*. Score it on those.

## Scoring

`node evals/score.mjs score <run-dir>` lists all nine, separated. Tick each judgement defect
the critic named on its own. A confident finding that is not on the list counts against it —
inventing problems to seem thorough is its own failure mode.

Do not read `defects.yaml` to the agent. Obviously.
