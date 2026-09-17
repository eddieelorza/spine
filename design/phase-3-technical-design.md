# AI Product OS — Phase 3: Technical Design

> Status: **Draft for review. Do not implement until approved.** No code written.
> Builds on `phase-1-analysis.md` (D1–D5) and `phase-2-product-spec.md`.
> Schema sketches and pseudocode below are *design artifacts* — the normative contract Phase 4 implements — not implementation.
>
> Labels: `[DECISION]` proposed · `[ASSUMPTION]` reversible · `[OPEN]` unresolved · `[CHANGE]` amends an earlier phase

---

## 0. Changes to earlier phases

Two things I got wrong or under-specified earlier, corrected here:

- **`[CHANGE]` `.product/index.json` is removed from v0.1.** Phase 1 §12 proposed a derived index. It's a cache with no proven need — 500 small files parse in well under the performance budget, and a cache that can disagree with the filesystem is a correctness liability for zero measured benefit. Agents that want a manifest use `product list --json`. Reintroduce only when a measurement demands it.
- **`[CHANGE]` `product node accept` is added to the CLI.** Phase 2's US-014 (human acceptance) had no command behind it. Without an explicit, near-zero-friction verb, acceptance becomes hand-editing a YAML field, which is exactly the friction that makes the guarantee theatre.

---

## 1. Architecture

### 1.1 The two hard boundaries

Everything else follows from these:

```
┌──────────────────────────────────────────────────────────────┐
│  INTELLIGENCE  — prompt packs, executed by any coding agent   │
│  spec/agents/*.agent.md  →  adapters/claude-code/             │
│  Writes prose. Calls the CLI for anything structural.         │
└───────────────────────────┬──────────────────────────────────┘
                            │  shell / stdout(JSON)
┌───────────────────────────▼──────────────────────────────────┐
│  DETERMINISM  — packages/cli + packages/core                  │
│  Zero LLM. Zero network. Same input → same output, always.    │
└───────────────────────────┬──────────────────────────────────┘
                            │  read / write
┌───────────────────────────▼──────────────────────────────────┐
│  TRUTH  — the workspace on disk, in git                       │
│  Markdown + YAML frontmatter. Human-editable. Authoritative.  │
└──────────────────────────────────────────────────────────────┘
```

**Boundary 1 (D4):** the CLI never calls a model. Enforced by an architecture test (§10.6), not by discipline.
**Boundary 2 (D5):** agents never call each other. The filesystem is the only message bus. There is no orchestrator, no scheduler, no queue.

### 1.2 Internal layering of `packages/core`

Strictly one-directional. No layer imports a layer below-to-above.

| Layer | Responsibility | Purity |
|---|---|---|
| `fs` | Discover workspace root, enumerate node files, read/write. The **only** module touching disk. | I/O, injectable port |
| `parse` | Frontmatter + body → `RawNode`. Never throws; returns `RawNode \| BrokenNode`. | Pure |
| `schema` | Validate `RawNode` against common + kind schema → `Node \| SchemaViolation` | Pure |
| `graph` | Resolve edges, build adjacency, detect cycles, invert for descendants | Pure |
| `rules` | Run the rule set over `(nodes, graph)` → `Finding[]` | Pure |
| `query` | `why`, `status`, `context`, `list` → **data structures, never strings** | Pure |
| `render` | Data → human text / JSON / markdown | Pure |
| `mutate` | ID allocation, node creation, linking, acceptance | I/O via `fs` port |

`packages/cli` is argument parsing, exit codes, colour and process concerns. It owns no logic.

### 1.3 The pipeline

```
workspace root
   └─ fs.discover()        → file list
      └─ parse()           → RawNode[] + BrokenNode[]
         └─ schema()       → Node[] + SchemaViolation[]
            └─ graph()     → Graph (adjacency, inverted index, cycle set)
               └─ rules()  → Finding[]
                  └─ query() → WhyResult | StatusResult | ContextBundle | NodeList
                     └─ render() → text | json
```

### 1.4 Load-bearing design rules

- **`[DECISION]` Fail-soft, never fail-fast.** A malformed node becomes a `BrokenNode` carrying its parse error and `file:line`; the pipeline continues. `check` must report *all* problems in one run — a validator that stops at the first error and forces N round-trips gets disabled (Phase 1 T8).
- **`[DECISION]` Queries return data; only renderers make strings.** Non-negotiable, because the primary consumer of every command is an *agent* reading `--json`, not a human reading a tree. Retrofitting this later means rewriting every command.
- **`[DECISION]` The filesystem is authoritative; nothing else is.** No cache, no database, no derived state that can disagree.
- **`[DECISION]` Structure is written only by `mutate`, never by an agent's text editing.** Agents call `product node new|link|accept`. This is the concrete mitigation for T3 (agents corrupting structured files).
- **`[DECISION]` Deletion does not exist.** `status: dropped` or `supersedes`. Removing a file orphans every citation, including ones already in git history, agent transcripts and external tools.

---

## 2. Language and runtime

**`[DECISION]` TypeScript on Node.js ≥20, ESM, published to npm as `@ai-product-os/cli`, runnable via `npx`.**

| Criterion | TypeScript/Node | Go | Rust | Python |
|---|---|---|---|---|
| Already installed for the target persona | ✅ near-universal | ⚠️ | ⚠️ | ✅ |
| Zero-install trial (`npx`) | ✅ **decisive** | ❌ | ❌ | ⚠️ `uvx` |
| Markdown/YAML/JSON-Schema ecosystem | ✅ best | ⚠️ | ⚠️ | ✅ |
| Single static binary | ❌ | ✅ | ✅ | ❌ |
| Startup latency | ⚠️ ~50–90ms | ✅ ~2ms | ✅ | ❌ ~150ms+ |
| Contributor pool in this niche | ✅ largest | ⚠️ | ❌ | ✅ |

The decisive factor is **trial friction**: `npx @ai-product-os/cli init` with nothing installed is the difference between a starred repo and a used one, for a persona already living in Node tooling. Node's ~90ms startup is charged against a sub-second budget that is otherwise nearly free, so it's affordable.

**Rejected:** Go — better runtime characteristics, materially worse distribution and contribution for this audience. Revisit only if startup becomes a real complaint (`why` is run interactively many times a day, so this is a genuine risk, not a hypothetical one) `[OPEN — measure in v0.1]`.

**Dependency policy `[DECISION]`:** near-zero. A YAML parser and an argument parser. No framework, no ORM, no logger, no HTTP client — the last one is enforced by test. Every dependency is a supply-chain risk in a tool that reads a user's whole product strategy.

---

## 3. CLI structure

### 3.1 Commands

```
product init [--name <name>] [--here]

product node new <KIND> --title <t> [--parent <ID>] [--epistemic <e>]
                                    [--evidence <text>] [--body-file <path>]
product node show <ID>
product node link <FROM-ID> <EDGE> <TO-ID>
product node accept <ID>...
product node drop <ID> [--superseded-by <ID>]

product list [--kind K] [--status S] [--epistemic E] [--orphans] [--unvalidated]
product why <ID> [--depth N] [--no-footer]
product check [--severity error|warn|info] [--rule R]
product status [--stage S]
product context <ID> [--budget-tokens N] [--direction up|down|both]
```

Nine verbs. Every one of them is either something a human does in under 10 seconds or something an agent calls. Nothing else ships in v0.1.

### 3.2 Global conventions

| Flag | Behaviour |
|---|---|
| `--json` | **Available on every command.** Structured output for agent consumption. The human renderer is the secondary path. |
| `--workspace <path>` | Override discovery |
| `--quiet` / `--no-color` | CI and piping |

**Exit codes `[DECISION]`:** `0` success · `1` validation errors present · `2` usage error · `3` workspace not found or unreadable · `4` refused (guard-rail violation, e.g. agent tried to modify an accepted node).

Distinguishing `1` from `4` matters: an agent must be able to tell "the graph has problems" from "you were not allowed to do that."

### 3.3 Workspace discovery

Walk up from cwd for `.product/config.yaml`, stopping at the git root or filesystem root. Same ergonomics as `git`. `--workspace` overrides.

### 3.4 The agent-facing contract

Because agents are first-class callers, these are hard interface guarantees, not conveniences:

1. `--json` output is **schema-versioned** (`{"schema": 1, ...}`) so adapters can evolve.
2. Errors go to stderr as JSON too, when `--json` is set. An agent must never have to parse a human error string.
3. Every mutating command echoes what it created: `{"id": "US-015", "path": "...", "warnings": [...]}`.
4. No command is ever interactive when `--json` is set. No prompts, no TTY assumptions.

---

## 4. Agent / skill format

### 4.1 Neutral contract — `spec/agents/<name>.agent.md`

```yaml
---
name: product-discovery
version: 1
role: >
  Frame the problem and surface what is known versus assumed.
  You do not invent research. You surface the absence of it.

reads:   [OBJ, GOAL, NEED, ASSUM, QUES, RISK]
writes:  [NEED, ASSUM, QUES, RISK]          # hard whitelist, CLI-enforced
narrative_writes: [problem-definition.md]

preconditions:
  - workspace_exists
  - file_exists: 00-context/idea.md

epistemic_defaults:
  NEED:  { epistemic: hypothesis, confidence: low, evidence: "" }
  ASSUM: { epistemic: assumption, confidence: low }

required_links:
  NEED: []                                   # NEED is a root kind
  RISK: []

prohibitions:
  - never_write_kind_outside_whitelist       # enforced: CLI
  - never_set_epistemic_fact_without_evidence# enforced: CLI
  - never_modify_accepted_node               # enforced: CLI
  - never_create_orphan                      # enforced: CLI
  - never_state_invented_research_as_observed# enforced: prompt only  ⚠
  - never_write_a_need_the_user_did_not_imply# enforced: prompt only  ⚠

done_when:
  - at_least: { kind: NEED, count: 1 }
  - narrative_exists: problem-definition.md
  - check_passes_for_kinds: [NEED, ASSUM, QUES]

handoff:
  next: product-manager
  message: "Needs are drafted and unvalidated. Review and accept before strategy."
---

## Instructions
<the prompt body — portable prose, no platform-specific syntax>

## Protocol
- Allocate IDs only via `product node new`. Never write an ID yourself.
- Create edges only via `product node link`.
- Read context only via `product context` or `product list --json`.
- After writing, run `product check --json` and report findings. Do not fix them silently.
- Never mark anything accepted. Only the human accepts.
```

### 4.2 Enforced vs. merely requested — the honest table

This distinction is the difference between a guarantee and a wish, and it should be stated plainly in the docs:

| Prohibition | Enforcement | Strength |
|---|---|---|
| Cannot create a node kind outside its whitelist | CLI checks `--agent` flag against the contract | **Hard** |
| Cannot create an orphan | `node new --parent` required for non-root kinds | **Hard** |
| Cannot set `epistemic: fact` without evidence | CLI refuses; exit 4 | **Hard** |
| Cannot modify a node at `status: accepted` | CLI refuses; exit 4 | **Hard** |
| Cannot allocate or reuse an ID | Only `mutate` allocates | **Hard** |
| Cannot mark anything accepted | `node accept` rejects `--agent` calls | **Hard** |
| Will not invent user research | Prompt only | **Soft ⚠** |
| Will not overstate confidence | Prompt only + critic review | **Soft ⚠** |
| Will not generate 40 needs where 5 exist | Prompt + soft cap warning | **Soft ⚠** |

Six of nine are structural. The three soft ones are exactly where the `product-critic` agent and human acceptance earn their place — and they are the residual risk that RISK-001 (fabricated grounding) is never fully eliminated, only reduced and made visible.

### 4.3 Compilation to adapters

`spec/agents/*.agent.md` → `adapters/claude-code/` as skills + subagents + slash commands, produced by a build step and committed (so users can read what runs). v0.1 ships one adapter; a second adapter must require **zero changes to `packages/core`** — that's KPI-005, and §10.6 has a test asserting it structurally.

---

## 5. Artifact schema

### 5.1 Node file — `04-backlog/stories/US-014.md`

```yaml
---
id: US-014
kind: US
title: Allow customers to split payment
status: accepted                # draft | proposed | accepted | superseded | dropped
epistemic: decision             # fact | assumption | hypothesis | decision | open_question
confidence: high                # low | medium | high
evidence: |
  Decided 2026-08-14 after reviewing checkout drop-off. See DEC-003.
links:
  derives_from: [FEAT-002]
  addresses:    [NEED-003]
  assumes:      [ASSUM-004]
acceptance_criteria:            # kind-specific (US)
  - Each participant can pay their own share independently
  - Order completes only when all shares are settled
  - A participant who abandons does not block the others
provenance:
  author: agent:product-manager
  command: /product:stories
  created: 2026-08-14T10:22:03Z
  updated: 2026-08-19T09:01:44Z
  accepted_by: human
tags: [checkout]
---

Free-form markdown. The part a human actually reads and edits.
Editing this body never changes the graph.
```

### 5.2 Common fields

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | `KIND-NNN` | ✅ | Immutable. Must match filename. |
| `kind` | enum(11) | ✅ | Authoritative — **folder position is decorative** |
| `title` | string ≤120 | ✅ | One line |
| `status` | enum | ✅ | default `draft` |
| `epistemic` | enum | ✅ | The anti-slop field |
| `confidence` | enum | — | Meaningless without `epistemic` |
| `evidence` | string | conditional | **Required and non-empty when `epistemic: fact`** |
| `links` | map<edge, ID[]> | — | Upward/outward only (D3) |
| `provenance` | object | ✅ | Written by CLI, not by hand |
| `tags` | string[] | — | |

### 5.3 Kind-specific fields

| Kind | Additional | Root? |
|---|---|---|
| `OBJ` | — | ✅ root |
| `GOAL` | — | requires `serves` |
| `KPI` | `definition`* `baseline` `target`* `instrumentation`* | ✅ root |
| `NEED` | `who`* | ✅ root |
| `FEAT` | — | requires `addresses` + `serves` |
| `US` | `acceptance_criteria: string[]`* (min 1) | requires `derives_from` |
| `TASK` | `estimate?` `area?` | requires `derives_from` |
| `ASSUM` | `validation_method?` `validated_at?` | ✅ root |
| `QUES` | `blocking: bool` `answer?` | ✅ root |
| `DEC` | `context`* `options_considered` `rationale`* | ✅ root |
| `RISK` | `likelihood` `impact` `mitigated_by: ID[]` | ✅ root |

`*` = required.

`KPI.definition` and `KPI.target` being required is how "a KPI is not measurable" becomes rule **E006** rather than a prompt request — the single clearest example of the Phase 1 thesis that traceability rules beat traceability prompts.

### 5.4 Narrative artifacts

```yaml
---
type: narrative
cites: [OBJ-001, GOAL-001, NEED-001, NEED-003, FEAT-002]
generated_by: /product:prd
updated: 2026-08-14T10:40:00Z
---
```

Narrative docs carry no IDs and participate in no graph edges. `cites` exists only so `check` can flag citations of superseded or non-existent nodes. Prose is context; nodes are graph. Whether a narrative introduces uncited claims is a *critic* judgement, not a machine check — stated honestly rather than faked.

### 5.5 `.product/config.yaml`

```yaml
schema_version: 1
product: SplitPay
created: 2026-08-01
paths:
  root: product/
rules:
  W104: error        # promote "hypothesis with many descendants" to blocking
  W102: off
limits:
  soft_cap: { NEED: 15, FEAT: 20, US: 80 }   # warn past these (P9)
```

### 5.6 Filename convention

**`[DECISION]` `<ID>.md`, nothing else.** A slug in the filename (`US-014-split-payment.md`) is friendlier to browse but drifts the moment a title changes, and renaming breaks paths that agents and humans have already cited. Stability wins; `product list` is the browsing tool.

`[OPEN — Q3.1]` This is the decision in Phase 3 I'm least confident in. A directory of `US-001.md … US-080.md` is genuinely unpleasant to navigate in an editor sidebar. An alternative — canonical `<ID>.md` plus a generated, gitignored symlink tree with slugs — is more machinery than it's worth for v0.1. Flagging for your call.

---

## 6. IDs and traceability

### 6.1 ID scheme

**`[DECISION]` `KIND-NNN`** — uppercase kind, hyphen, zero-padded to 3, sequential per kind, from 001. Past 999 it widens naturally (`US-1000`); lexical sort degrades there, so all sorting is numeric on the parsed suffix.

**Invariants — these are absolute:**
1. **Immutable.** An ID never changes. There is no `renumber` command and there never will be.
2. **Never reused.** Dropping `US-014` does not free `014`.
3. **Allocated only by `mutate`,** from `.product/counters.yaml`.
4. **Filename matches ID** (rule E008).

```yaml
# .product/counters.yaml
OBJ: 2
NEED: 6
US: 14
```

### 6.2 Concurrency

Sequential IDs collide across branches: two branches both allocate `US-015`, git merges the *files* cleanly, and the graph is silently corrupt. Per the confirmed solo persona this is rare, so v0.1 **detects rather than prevents**:

- **E002 (duplicate ID)** catches it on the next `check` — which is why `check` belongs in a pre-commit hook or CI from day one.
- Manual remedy: create a fresh node, `supersedes` the loser, drop it. Ugly and rare.
- `[OPEN]` `product fix-ids` (reallocate the *newer* colliding node and rewrite inbound references) is a v0.2 item, gated on team usage. It is the only sanctioned operation that may change an ID, and it must run before either node is cited externally.

### 6.3 Edge type matrix — the normative table

Rule **E003** is exactly this table. Anything not listed is invalid.

| Source | Edge | Target |
|---|---|---|
| `GOAL` | `serves` | `OBJ` |
| `FEAT` | `serves` | `GOAL` |
| `FEAT` | `addresses` | `NEED` |
| `US` | `derives_from` | `FEAT` |
| `US` | `addresses` | `NEED` *(optional)* |
| `TASK` | `derives_from` | `US` |
| `TASK` | `depends_on` | `TASK` |
| `OBJ` `GOAL` `FEAT` `US` | `measured_by` | `KPI` |
| *any* | `assumes` | `ASSUM` |
| *any* | `questions` | `QUES` |
| *any* | `decided_by` | `DEC` |
| *any* | `risks` | `RISK` |
| *any* | `supersedes` | *same kind* |

Edges are stored **only on the source node**. Descendants are computed by inverting the adjacency at load time — one write location per edge means two nodes can never disagree about a relationship, and creating a child never requires touching its parent (the T3 agent-safety property).

**Acyclic:** `serves`, `addresses`, `derives_from`, `supersedes`, `depends_on`. Cycles are error E004.

---

## 7. Validation rules

### 7.1 Errors — non-zero exit

| ID | Rule | Message shape |
|---|---|---|
| **E001** | Dangling reference | `US-021 → FEAT-099 does not exist` |
| **E002** | Duplicate ID | `US-015 defined in 2 files` |
| **E003** | Type-invalid edge | `TASK-004 derives_from OBJ-001 — TASK may only derive_from US` |
| **E004** | Cycle | `FEAT-002 → GOAL-001 → FEAT-002` |
| **E005** | **Orphan `US`/`TASK`/`FEAT`/`GOAL`** | `US-021 has no upstream link` |
| **E006** | KPI not measurable | `KPI-003 has no definition/target` |
| **E007** | `epistemic: fact` with empty `evidence` | `NEED-002 claims fact with no evidence` |
| **E008** | Malformed node | `04-backlog/stories/US-009.md:6 — invalid YAML` / ID≠filename / missing required field |

**E005 is the product.** Everything else is hygiene; E005 is the traceability guarantee itself.

### 7.2 Warnings

| ID | Rule |
|---|---|
| **W101** | `FEAT` with no `measured_by` — feature with no success metric |
| **W102** | `NEED` at `hypothesis` with ≥5 descendants — substantial work on unvalidated ground |
| **W103** | `OBJ`/`GOAL` with no descendants — stated intent nobody is working on |
| **W104** | `US` with zero acceptance criteria, or AC containing hedges (`etc.`, `and so on`, `as appropriate`, `properly`, `if needed`) |
| **W105** | Node at `draft` for >14 days — staleness |
| **W106** | Link to a `superseded`/`dropped` node |

W104's hedge list is a deliberately crude keyword check. Real ambiguity detection is the critic's job; the linter should not pretend to judgement it doesn't have.

### 7.3 Rules as data

`spec/rules/*.yaml` holds `{id, name, severity, description, message_template, fix_hint, rationale}`; implementations register by ID. Severity is overridable per workspace (§5.5). §10.5 has a test asserting **every declared rule has an implementation and a fixture that triggers it** — this is what stops the rule set and the code from drifting apart, which is the standard failure mode for validators.

### 7.4 Finding shape

```json
{ "rule": "E005", "severity": "error", "node": "US-021",
  "file": "04-backlog/stories/US-021.md", "line": 1,
  "message": "US-021 has no upstream link",
  "fix": "product node link US-021 derives_from <FEAT-ID>" }
```

Every finding carries a concrete `fix` a human can paste or an agent can execute. A validator that reports problems without remedies is a nag.

---

## 8. How `product status` works

### 8.1 Principle

Percentages derive **only** from structural facts. Nothing in this algorithm consults a model or judges quality. Where a denominator is undefined, `status` prints a count and refuses to draw a bar (P8).

### 8.2 Stage definitions (v0.1)

Each stage declares checks; each check is boolean.

| Stage | Checks (m) |
|---|---|
| **Discovery** | ≥1 `NEED` · `problem-definition.md` exists · ≥1 `ASSUM` or `QUES` · all `NEED` accepted · no errors in these kinds |
| **Strategy** | ≥1 `OBJ` · ≥1 `GOAL` · ≥1 `KPI` · every `OBJ` `measured_by` a KPI · every `GOAL` `serves` an OBJ · all accepted · no errors |
| **PRD** | `prd.md` exists · every `FEAT` cited · accepted by human |
| **Backlog** | every `FEAT` has ≥1 `US` · every `US` has ≥1 AC · zero orphan US · acceptance ratio |
| **Delivery** | every accepted `US` has ≥1 `TASK` · zero orphan TASK · acceptance ratio |

```
score(stage) = passed_checks / total_checks
```

Bars render only for stages whose checks are fully enumerable. **Backlog and Delivery show counts, not bars**, because "how many stories should exist?" has no denominator — inventing one would be exactly the false precision P8 warns about.

### 8.3 Honesty block — always printed, never suppressible

```
unvalidated_needs   = NEED where epistemic ∈ {hypothesis, assumption}
affected_stories    = |descendants(unvalidated_needs) ∩ US|
open_assumptions    = ASSUM where status ∉ {accepted, dropped}
blocking_questions  = QUES where blocking = true and answer is empty
features_no_metric  = W101 count
errors              = E* count
```

The honesty block is why `status` exists. A version of this command that showed only progress bars would be a worse product than no command at all — it would manufacture exactly the false confidence the whole system is built to prevent.

---

## 9. How `product why` works

### 9.1 Algorithm

```
why(id, depth = ∞):
  start ← node(id)                          # E: not found → exit 3
  visited ← {}                              # id → node
  paths   ← []                              # for diamond dedup
  frontier ← [(start, [])]

  while frontier:
     (n, path) ← pop()
     if n ∈ visited: mark diamond; continue
     visited ← visited ∪ {n}
     for edge ∈ {serves, addresses, derives_from} :
        for target ∈ n.links[edge] :
           if depth not exceeded: push((target, path + [n]))
     if n has no upward edges: paths ← paths + [path + [n]]   # root

  metrics    ← { measured_by targets of every n ∈ visited }
  epistemics ← { assumes ∪ questions ∪ risks targets of every n ∈ visited }
  return WhyResult { start, tree(visited), roots, metrics, epistemics, warnings }
```

Cycles are impossible on a graph that passed `check`, but `why` must run on a *broken* workspace too — that's when you most need it — so the visited-set guard is mandatory, not defensive decoration. Diamonds (two paths to one ancestor) render once with a `↑ also via FEAT-003` marker rather than duplicating a subtree.

### 9.2 The honesty footer — precise semantics

```
unvalidated(n)  ≡  n.epistemic ∈ {hypothesis, assumption, open_question}
unevidenced(n)  ≡  n.evidence is empty or absent
open_assum(a)   ≡  a.kind = ASSUM ∧ a.status ∉ {accepted, dropped}
```

Footer prints when `∃ n ∈ visited : unvalidated(n)` **or** any reachable `ASSUM`/`QUES` is open. `--no-footer` suppresses it **in human output only** — `--json` always carries the warnings, so no agent can be handed a chain stripped of its caveats.

`[DECISION]` The footer is not configurable off in config.yaml. A user who can permanently silence it has bought a document generator with extra steps.

### 9.3 Determinism

Sibling ordering is stable: by edge type in matrix order, then by numeric ID. Two runs on the same workspace produce byte-identical output — required for snapshot tests (§10.3) and for sane diffs when `why` output is pasted into a PR.

---

## 10. Testing strategy

The core is deterministic and pure, so it is unusually testable — which is itself an argument for D4.

### 10.1 Unit
Parser (valid, malformed YAML, missing fields, BOM, CRLF, unicode titles) · ID allocator (sequence, no reuse after drop, counters recovery) · graph builder (inversion, cycle detection, diamonds) · each rule in isolation.

### 10.2 Fixture workspaces
`tests/fixtures/` — `minimal/` (one node per kind) · `valid/` (a complete realistic spine) · `broken-E001…E008/` (one workspace per error class, each triggering exactly its own rule and no other — this catches over-broad rules) · `warnings/` · `large/` (500 generated nodes, for §10.7) · `real/` (an anonymised snapshot of the dogfood workspace — the only fixture that will surface things nobody designed for).

### 10.3 Snapshot
`why`, `status`, `check` and `context` human output, plus `--json` for each. Snapshot tests are the practical regression net for renderers and they only work because of §9.3's determinism.

### 10.4 Property-based
- ID allocation never produces a duplicate under any interleaving.
- Any graph accepted by `check` is acyclic on all acyclic edge types.
- `descendants(inverted)` is the exact inverse of `ancestors` for every node.
- `why(n)` terminates on every workspace, **including cyclic and broken ones**.

### 10.5 Contract tests — the important ones
- **Every rule in `spec/rules/` has an implementation and a fixture that triggers it.** Fails when the spec and the code drift — the standard way validators rot.
- Every edge in the §6.3 matrix is exercised; every edge *not* in it is rejected.
- Every kind's required fields are enforced.
- Every agent contract in `spec/agents/` declares only real kinds and real edges.

### 10.6 Architecture tests
- `packages/core` imports nothing that performs network I/O; no `fetch`, no HTTP client, no SDK, no `openai`/`anthropic`/`@google` dependency anywhere in the dependency tree. **This is D4 enforced mechanically rather than trusted.**
- `packages/core` has no import from `packages/cli` or `adapters/`.
- `adapters/claude-code` is generated purely from `spec/` — regenerating it in CI produces no diff. This is the mechanical proof behind KPI-005.
- Layer-direction check across the §1.2 table.

### 10.7 Performance
`large/` (500 nodes): `check` < 1s, `why` < 300ms, `status` < 1s — asserted in CI, failing the build on regression. A budget that isn't enforced isn't a budget (T8).

### 10.8 Agent testing — the honest part

LLM behaviour cannot be unit-tested, and pretending otherwise would be its own kind of fabrication. The strategy is therefore **structural, not behavioural**:

1. **Make violations impossible, then test the impossibility.** Each of the six hard prohibitions in §4.2 gets a test asserting the CLI refuses with exit 4. That is the real guarantee.
2. **Adapter validity:** generated skills/subagents parse and load in Claude Code.
3. **Golden-scenario evals (manual, ~6 scenarios):** run each agent against a fixed input workspace and assert *structural* properties of the result — no orphans created, every `NEED` at `hypothesis` with empty evidence, `check` still passes, nothing accepted. Never assert on prose.
4. **Adversarial scenarios:** an idea prompt containing a fabricated research claim (does discovery launder it into a `fact`?); an idea containing an instruction to mark things validated (does it comply?). These target RISK-001 directly.
5. **The critic gets a planted-defect fixture** — a workspace with a known orphan, an unmeasurable KPI and an assumption stated as fact — and is scored on how many it names. Not a pass/fail gate; a tracked number that must not regress.

### 10.9 Not tested in v0.1
Prose quality · cross-model consistency · concurrent multi-process writes · workspaces >5000 nodes · schema migration (nothing to migrate from yet).

---

## 11. Open questions for your review

1. **`[OPEN — Q3.1]` Filenames: `US-014.md` or `US-014-split-payment.md`?** §5.6. I chose stability; you'll be the one browsing the sidebar. The decision I'm least sure of.
2. **`[OPEN]` Node startup latency.** ~90ms per `why`. Acceptable? If `why` becomes a many-times-per-hour reflex it may grate, and that would reopen the Go question — expensively, later.
3. **`[OPEN]` Where does the workspace live?** Phase 2 Q6 unresolved: `product/`, `docs/product/`, or `.product-os/`. Cosmetic, but painful to change once people have cited paths.
4. **`[OPEN]` Should `check` install a pre-commit hook on `init`?** It's what makes E002 (ID collision) survivable and the graph non-rotting — but silently installing hooks is rude. Proposed: offer it, default yes, never silent.
5. **`[OPEN]` Is 11 node kinds still right** now that you've seen the full schema surface? Each kind is ~1 schema entry, ~1 fixture and ~2 rules of ongoing cost.
6. **Still unanswered from Phase 2:** which real product is the dogfooding target, the licence, and the name.

---

## 12. Recommended next step

Review §1–§10 and settle Q3.1, Q3 (workspace location) and Q4 — the three that are cheap now and expensive after anyone has a workspace on disk.

Then **Phase 4, in this order**, because it front-loads the risk:

1. `parse` + `schema` + `graph` + `rules` + `check` — the deterministic core and E001–E008, against the `broken-*` fixtures.
2. `why` + the honesty footer — **the earliest point the product is demonstrable.** Get here fast and run it on your real product; if `why` doesn't feel valuable at this point, stop and reconsider before building agents.
3. `init` + `node new|link|accept` — mutation, guard-rails, exit code 4.
4. `status` + `context`.
5. The four agent contracts + the Claude Code adapter.

Steps 1–2 are roughly half the value of v0.1 and none of the LLM risk. They also produce the README's demo. If anything in Phase 4 has to be cut, it should be cut from step 5 upward, never from step 1.
