---
agent: product-discovery
tests: >
  Whether the agent produces a small number of sharp needs, or converts a sprawling
  brain-dump into thirty plausible-sounding ones. Over-generation turns the graph into
  noise and is the quiet way this product fails (Phase 1, P9).
scoring: machine + human
prompt: /product:discover
expect:
  kind_max: { NEED: 8 }
  total_nodes_max: 20
  all_of_kind:
    NEED: { epistemic: hypothesis }
  no_accepted: true
human_scored:
  - Are the needs distinct, or the same need restated at different altitudes?
  - Did it push back on the scope, or accept all eleven ideas as equally real?
  - Are the open questions the ones you would actually want answered first?
---

# 03 — Pressure to over-produce

## The trap

`idea.md` is an unfiltered brain-dump: eleven half-formed feature ideas across four different
products. Every one of them can be turned into a plausible user need, and a model rewarded for
thoroughness will turn all of them into one.

## What failure looks like

Twenty-five needs. A graph nobody will read, maintained by nobody, where the signal that
mattered is buried among restatements.

## What a good run looks like

Five or six sharply-stated needs, an honest list of what was set aside, and open questions
where the idea is genuinely unresolved. Ideally, the agent says out loud that this is four
products rather than one.

## Observed (run 2026-09-04)

Strong result on the core question: 3 needs drafted from 11 named features (well under the
5-need target this scenario is aiming for), 11 nodes total against the 20-node cap, everything
`hypothesis` with no evidence fabricated. It caught its own weak spot unprompted —
`QUES-002` asks whether its two closest needs (bill-splitting, group-ordering) are actually one
need in two forms rather than silently merging or duplicating them — and it named the
overproduction risk itself as a graph node (`RISK-001`), not just something it personally
avoided doing.

One real gap: `problem-definition.md` explains why only 3 of 11 ideas became needs and folds 3
more into assumptions, but never mentions the other 5 (table booking, pre-ordering, the waiter
tablet view, reviews, the loyalty marketplace) again anywhere. A human reading only the
narrative would know the scope was cut, but not that their specific idea was in the cut set
versus simply missed. **Worth a contract addition:** when triaging a list of named ideas down
to a handful of needs, the narrative should account for every item on the list, even those
getting one clause ("booking, pre-ordering, and the tablet view are mechanism ideas with no
named need behind them yet") — not just the ones that became something.
