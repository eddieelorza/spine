# AI Product OS — Phase 2: Product Specification

> Status: **Draft for review.** No code.
> Builds on `phase-1-analysis.md`. Decisions D1–D5 taken as approved.
> Labels: `[FACT]` · `[ASSUMPTION]` reversible · `[HYPOTHESIS]` needs evidence · `[DECISION]` · `[OPEN]`
>
> **Method note:** the enumerable parts of this spec are written in the proposed node format — real IDs, real typed links, real epistemic status. This is deliberate dogfooding. §10 reports what hurt.

**Confirmed inputs from Phase 1:**
- Primary user: **solo product engineer** `[DECISION]`
- Dogfooding: **a real product exists as the validation target** `[DECISION]`
- Resolved: Q3 → sequential IDs · Q6 → workspace lives in the product's own repo

---

## 1. Product vision

**The one-liner (README):**

> **AI Product OS** — from idea to production, without losing the why.
> A traceable reasoning layer that lives in your repo, so every task can explain the objective it serves — and tell you which parts of that reasoning were never actually validated.

**The vision statement:**

Software teams have never been better at *producing* — and AI coding agents have removed the last of the friction. What has not improved is *remembering why*. Intent is created once, in a document or a conversation, and destroyed by the act of execution. Three weeks later the ticket exists and the reasoning does not.

AI Product OS makes product reasoning a **first-class, version-controlled, queryable structure** that sits beside the code. Not documents — a graph. Every objective, need, feature, story and task is a node with a stable ID; every link between them is typed and validated by a program, not by good intentions. AI agents author the content; a deterministic core guarantees the structure; a human accepts or rejects everything.

And critically: the system knows the difference between what you *know* and what you *assumed*. A chain of reasoning that bottoms out in a guess says so, out loud, every time you query it.

**In three years, if this works:**
Asking "why does this exist?" of any line of work is as ordinary as running `git blame` — and getting an answer that includes *"…and this rests on an assumption nobody has tested"* is the normal, expected experience rather than an uncomfortable discovery in a retro.

**What it is not:**
Not a PRD generator. Not a project tracker. Not a Jira replacement. Not a documentation tool. It does not track *work*; it explains work.

---

## 2. Target users

### Primary — the only user v0.1 is designed for

**"The solo product engineer."**

One person who both decides what to build and builds it. Founder-engineer, technical PM who ships, staff engineer owning a product surface, indie builder, or a one-person product team inside a larger company.

| | |
|---|---|
| **Where they work** | Terminal + editor + a coding agent (Claude Code, Cursor, Codex). Markdown in the repo. Git for everything. |
| **What they own** | The whole chain — the decision *and* the implementation. Nobody hands them a spec; nobody hands them a ticket. |
| **What they've rejected** | Jira, formal process, planning ceremony, writing documents for an audience of nobody. They left that behind deliberately and will not accept it back. |
| **What has changed for them recently** | Their coding agent now writes most of the code. Their bottleneck moved from *typing* to *specifying*. They spend more time re-explaining context than they used to spend implementing. |
| **The moment of pain** | *"I decided this three weeks ago and I can't reconstruct why."* · *"My agent built exactly what I asked and exactly the wrong thing."* · *"I've been building on something I think a user said once."* |

**Why this user and no other, in v0.1:** zero adoption friction (nobody else has to agree), a CLI is a feature rather than a tax, and they personally feel both ends of the chain — which is the only way traceability can pay back with a single participant.

### Secondary — informs the design, does not drive it

Technical PMs on 5–15 person teams (v0.2+); AI-native small teams where an agent implements most work (v0.2+).

### Explicit non-users for v0.1

Non-technical PMs (need a UI) · enterprise / regulated teams (need audit, sign-off, Jama-class rigor) · design-led organisations · anyone whose real need is "replace Jira" · teams adopting this top-down as process.

### The riskiest thing about this section

`[HYPOTHESIS · low confidence · evidence: none]` That a *solo* person feels traceability pain hard enough to pay maintenance cost. Traceability's classic payoff is surviving handoffs *between people*. The bet is that a solo engineer now has two handoff partners anyway — **their coding agent**, and **their own future self across context resets**. If that bet is wrong, the product is wrong. Validating it is a task in the roadmap (§9), not a preamble.

---

## 3. Jobs To Be Done

**Main job:**

> When I'm building a product mostly on my own with AI doing much of the execution,
> I want the reasoning behind my decisions to stay attached to the work that came out of them,
> so I can act on intent rather than on whatever I last happened to remember.

**Related jobs**, each mapped to the need it generates:

| # | Job statement | → Need |
|---|---|---|
| J1 | When I revisit work I scoped weeks ago, I want to recover *why* it exists without reconstructing it from memory, so I don't re-litigate settled decisions or ship something whose purpose has quietly drifted. | NEED-001 |
| J2 | When I hand a task to a coding agent, I want it to carry the intent and constraints behind the task, so it stops building the technically-correct wrong thing. | NEED-002 |
| J3 | When I'm about to invest a week, I want to see which of my beliefs are validated and which are guesses, so I don't build a floor on top of a hypothesis. | NEED-003 |
| J4 | When I look at everything in flight, I want to see what serves no objective and what objective nothing serves, so I can cut and refocus without a planning ritual. | NEED-004 |
| J5 | When a decision happens (usually mid-conversation, usually in 30 seconds), I want to capture it in seconds too, so capturing doesn't lose to not-capturing. | NEED-005 |
| J6 | When I set up my reasoning layer, I want it in the repo next to the code, so it isn't a second system that rots in a wiki. | NEED-006 |

**Emotional dimension:** the job is partly relief from a specific, low-grade anxiety — *"I'm moving fast and I'm not sure the speed is pointed anywhere."* The product's honesty output (unvalidated counts, orphan warnings) is what discharges it. A tool that only *generated* more artifacts would increase the anxiety, not reduce it.

**Social dimension (solo):** near zero — deliberately. Anything that only pays off when a second person looks at it belongs in v0.2.

---

## 4. Key use cases

Ordered by how much they matter for v0.1 adoption.

**UC-1 — "Why does this exist?" (the wedge)**
Mid-implementation, the user runs `product why US-014`. Gets the chain to the business objective in under a second, plus the honesty footer. *This is the 10-second demo and the README's first screenshot.* If this doesn't land, nothing else matters.

**UC-2 — Ground a new feature before building it**
User has an idea. Runs `/product:discover` then `/product:strategy` then `/product:stories`. Ends with a spine from objective to stories where the agent has explicitly marked which needs are hypotheses. The value isn't the artifacts — it's being confronted with what they don't actually know.

**UC-3 — Brief a coding agent with full context**
Before implementing, `product context TASK-021` returns the task's complete ancestor chain as one bundle the agent reads. Intent travels with the task. `[HYPOTHESIS]` This may turn out to be the *strongest* value driver for this persona, ahead of UC-1.

**UC-4 — Catch the drift**
`product check` in CI or pre-commit. Fails on an orphan story, a dangling reference, a KPI with no measurable definition. The graph can't silently rot.

**UC-5 — Weekly reality check**
`product status`. Not a progress dashboard — an honesty dashboard: *3 unvalidated needs underpin 11 stories · 4 assumptions require validation · 2 features have no success metric.*

**UC-6 — Adversarial review before committing**
`/product:review` before accepting a batch of generated nodes. The critic names traceability gaps and assumptions being treated as facts, referencing node IDs. Nothing is auto-fixed.

**UC-7 — Record a decision in 20 seconds**
A decision happens in conversation. `product node new DEC --title "..."` linked to the affected feature. Must be faster than opening a doc, or it loses.

**UC-8 — Adopt an existing product** `[known weak in v0.1]`
The user already has a backlog elsewhere. v0.1 handles this badly — they must hand-seed objectives and needs. This is the *most common real-world entry* and it's an acknowledged limitation, stated in the README rather than discovered by the user.

---

## 5. v0.1 scope

### In

**Node kinds (11):** `OBJ` `GOAL` `KPI` `NEED` `FEAT` `US` `TASK` · `ASSUM` `QUES` `DEC` `RISK`

**Narrative artifacts (3):** `idea.md` · `problem-definition.md` · `prd.md` — prose that cites IDs and never redefines them.

**Deterministic CLI (no LLM, ever):**
`product init` · `check` · `why <ID>` · `status` · `context <ID>` · `node new|show|link` · `list`

**Agent skills (Claude Code adapter only):**
`/product:new` · `/product:discover` · `/product:strategy` · `/product:prd` · `/product:stories` · `/product:plan` · `/product:review`
plus thin wrappers: `/product:why` `/product:status` `/product:check`

**Agents (4):** `product-discovery` · `product-manager` · `system-analyst` · `product-critic`

**Validation:** 8 error rules + 6 warning rules (Phase 1 §11).

**The portable spec:** `spec/schema` + `spec/rules` + `spec/agents` as tool-neutral source of truth, with one generated adapter.

### Out — and saying no is the point

Web UI · graph visualisation · database · server · auth · billing · teams · cloud sync · Jira/Linear/Notion/Figma integration · MCP server · IDE extension · roadmap & prioritisation commands · personas · JTBD artifacts · user journeys · flows · opportunities · epics · analytics events · experiments · learnings · system architecture / API / data-model artifacts · frontend architecture · multi-product workspaces · non-Claude adapters · the CLI calling an LLM · automatic extraction from code or git history · plugin system · custom node kinds · telemetry.

### The bar v0.1 must clear

> The user runs it on their real product. Within 30 minutes they have a chain from business objective to technical task where every link is real; `product why` on a task tells them something true they'd otherwise have reconstructed from memory; `product check` catches at least one gap they hadn't noticed. Two weeks later the workspace has been *updated*, not just generated.

That last sentence is the whole test. Generation is easy; **maintenance is the hypothesis.**

---

## 6. Initial PRD — AI Product OS v0.1

### 6.1 Problem

See Phase 1 §2. In one line: *product reasoning is created in a medium that cannot be queried and is destroyed by execution — and AI agents now execute faster than intent can be transmitted.*

### 6.2 Objectives, goals and metrics (node form)

```yaml
OBJ-001  Solo product engineers keep intent attached to AI-assisted execution
         epistemic_status: hypothesis   confidence: medium   evidence: none yet — validated by dogfooding
         measured_by: [KPI-001, KPI-003]

OBJ-002  The reasoning format outlives any single tool or model provider
         epistemic_status: decision     confidence: high     evidence: D4/D5 in phase-1-analysis
         measured_by: [KPI-005]
```

```yaml
GOAL-001  Any work item can explain itself in under 10 seconds
          serves: [OBJ-001]        measured_by: [KPI-002]
GOAL-002  Maintaining the graph costs less than it returns
          serves: [OBJ-001]        measured_by: [KPI-003]
GOAL-003  Generated reasoning is never presented as validated fact
          serves: [OBJ-001]        measured_by: [KPI-004]
GOAL-004  Determinism and intelligence stay separable
          serves: [OBJ-002]        measured_by: [KPI-005]
```

```yaml
KPI-001  Two-week workspace retention
         definition: % of users completing a spine whose workspace has commits ≥14 days later
         current: unknown   target: ≥40%   instrumentation: manual interview (no telemetry in v0.1)

KPI-002  Time from `init` to first complete OBJ→TASK chain
         definition: wall-clock median, observed session
         current: unknown   target: <30 min   instrumentation: dogfooding + observed sessions

KPI-003  Maintenance ratio
         definition: nodes created/edited in week 2+ ÷ nodes at end of week 1
         current: unknown   target: >0.3     instrumentation: git log on the dogfood workspace
         note: THE metric. Distinguishes a used graph from a generated one.

KPI-004  Unvalidated-node honesty rate
         definition: % of agent-created NEED nodes carrying epistemic_status hypothesis + empty evidence
         current: unknown   target: 100%     instrumentation: `product check` on generated workspaces

KPI-005  Spec portability
         definition: can a second adapter be produced without changing packages/core
         current: unknown   target: yes      instrumentation: build a stub adapter in v0.2
```

`[ASSUMPTION]` KPI-001/002 targets are picked to be falsifiable, not because I have a basis for the numbers. Flagged rather than dressed up.

### 6.3 User needs (all unvalidated — this is the point)

```yaml
NEED-001  Recover the why of a decision weeks later without memory archaeology
NEED-002  Give a coding agent intent, not just instructions
NEED-003  Know which beliefs are validated vs guessed before building on them
NEED-004  See what serves no objective, and what objective nothing serves
NEED-005  Capture a decision in seconds, or it won't get captured
NEED-006  Keep reasoning in the repo, not in a second system
```

> **Every one of the above is `epistemic_status: hypothesis · confidence: low · evidence: none`.**
> They are derived from the author's own experience and reasoning, not from research. No interviews have been conducted. Per the product's own principles, these are not facts and must not be cited as if they were. The dogfooding period (§9, R-1) is the first evidence any of them will ever have.

### 6.4 Features and requirements

| ID | Feature | addresses | serves | measured_by |
|---|---|---|---|---|
| FEAT-001 | **Reasoning graph format** — nodes, typed edges, frontmatter schema | NEED-006 | GOAL-002, GOAL-004 | KPI-005 |
| FEAT-002 | **`why` query** — upward chain + honesty footer | NEED-001, NEED-003 | GOAL-001, GOAL-003 | KPI-002 |
| FEAT-003 | **`check` validator** — 8 errors, 6 warnings, CI-ready | NEED-004 | GOAL-001 | KPI-004 |
| FEAT-004 | **`status`** — structural completeness + honesty counters | NEED-003, NEED-004 | GOAL-003 | — |
| FEAT-005 | **Epistemic layer** — status, confidence, evidence, provenance | NEED-003 | GOAL-003 | KPI-004 |
| FEAT-006 | **Agent skill pack** — 4 agents as portable contracts + Claude adapter | NEED-005 | GOAL-002, GOAL-004 | KPI-005 |
| FEAT-007 | **`context <ID>`** — scoped ancestor bundle for agent briefing | NEED-002 | GOAL-001 | — |
| FEAT-008 | **`init` + node CLI** — scaffold and safe node/edge creation | NEED-005, NEED-006 | GOAL-002 | KPI-002 |

Every feature traces to ≥1 need and ≥1 goal. `product check` on this spec would pass rules 5, 9 and 11.

### 6.5 User stories (v0.1)

```yaml
US-001  As a product engineer, I can scaffold a workspace in my existing repo
        derives_from: FEAT-008
        AC: `product init` creates .product/ + folders; refuses to overwrite; works in an existing repo;
            completes in <5s; prints the next command to run

US-002  I can create a node without inventing an ID myself
        derives_from: FEAT-008
        AC: `product node new NEED --title "..."` allocates the next sequential ID, writes a valid file,
            prints path + ID; ID is never reused; agents use this rather than hand-writing IDs

US-003  I can link two nodes and be told when the link is invalid
        derives_from: FEAT-001, FEAT-008
        AC: `product node link US-014 derives_from FEAT-002` writes the upward edge only;
            rejects type-invalid edges with the allowed set; rejects dangling targets

US-004  I can ask why any work item exists
        derives_from: FEAT-002
        AC: walks serves/addresses/derives_from to all roots; attaches measured_by KPIs;
            surfaces every ASSUM/QUES/RISK on the path; renders in <1s on 500 nodes;
            ALWAYS prints the honesty footer when the chain contains unvalidated nodes

US-005  I am warned when a chain rests on unvalidated reasoning
        derives_from: FEAT-002, FEAT-005
        AC: footer names each hypothesis-status ancestor and open assumption by ID;
            absent only when the chain is fully evidenced; never suppressible by a flag

US-006  I can validate the whole graph and get actionable errors
        derives_from: FEAT-003
        AC: 8 error rules + 6 warnings; each finding has ID + file:line + a suggested fix;
            non-zero exit on any error; <1s on 500 nodes; severity is configurable

US-007  I can see structural completeness without fake progress
        derives_from: FEAT-004
        AC: per-stage n/m on required-nodes / required-links / human-acceptance / zero-errors;
            a bar ONLY where a denominator is defined, otherwise a count;
            honesty block always printed

US-008  I can brief a coding agent with a task's full reasoning
        derives_from: FEAT-007
        AC: `product context TASK-021` emits ancestors + linked assumptions/decisions as one markdown
            bundle; token-bounded; excludes unrelated subtrees

US-009  A discovery agent helps me frame the problem without inventing research
        derives_from: FEAT-006, FEAT-005
        AC: creates NEED/ASSUM/QUES/RISK; every NEED it creates defaults to hypothesis with empty
            evidence; it states plainly that it has invented them; refuses to write epistemic_status: fact

US-010  A PM agent turns grounded needs into objectives, goals, KPIs, features and stories
        derives_from: FEAT-006
        AC: refuses to run with zero NEED nodes; every FEAT it creates links upstream;
            every KPI it creates has a measurable definition or is flagged

US-011  A PRD is composed from my existing nodes, not invented alongside them
        derives_from: FEAT-006
        AC: prd.md cites node IDs; introduces no new claims that aren't nodes;
            regenerating it does not create duplicate facts

US-012  An analyst agent turns stories into technical tasks
        derives_from: FEAT-006
        AC: every TASK links derives_from a US; surfaces RISK/DEC nodes for non-obvious choices

US-013  A critic reviews my work and changes nothing
        derives_from: FEAT-006
        AC: reports gaps/contradictions/assumptions-as-facts/ambiguous AC/missing metrics;
            every finding cites node IDs; writes zero nodes; never auto-fixes

US-014  Nothing is real until I accept it
        derives_from: FEAT-005
        AC: agent-created nodes are status: draft|proposed; `accepted` requires a human action;
            agents refuse to modify accepted nodes; status counts only accepted nodes as complete
```

### 6.6 Technical tasks (representative — full breakdown is Phase 3)

```yaml
TASK-001  Define node + edge JSON schema and workspace version   derives_from: US-002, US-003
TASK-002  Frontmatter parser with human-legible error positions   derives_from: US-006
TASK-003  ID allocator with counters file + collision detection   derives_from: US-002
TASK-004  Graph builder + index (derived, regenerable)            derives_from: US-004, US-006
TASK-005  Rule engine: 8 errors, 6 warnings, configurable severity derives_from: US-006
TASK-006  Upward walker + honesty-footer renderer                 derives_from: US-004, US-005
TASK-007  Stage completeness model + status renderer              derives_from: US-007
TASK-008  Scoped context bundler with token budget                derives_from: US-008
TASK-009  Workspace scaffolder + templates                        derives_from: US-001
TASK-010  Neutral agent-contract format + 4 contracts             derives_from: US-009..US-013
TASK-011  Claude Code adapter generator (skills/subagents/commands) derives_from: US-009..US-013
TASK-012  Acceptance lifecycle + agent write-guards               derives_from: US-014
```

### 6.7 CLI experience (the actual UX of v0.1)

```
$ product why US-014

US-014  Allow customers to split payment                                  [accepted]
 └─ derives_from  FEAT-002  Split Bill                                    [accepted]
     ├─ addresses NEED-003  Groups need independent payment methods       [hypothesis · low]
     └─ serves    GOAL-001  Reduce payment friction                       [accepted]
         └─ serves OBJ-001  Increase completed restaurant transactions    [accepted]
                    measured_by  KPI-002  Checkout completion rate        [42% → 55%]

⚠  This chain rests on 1 unvalidated need and 2 open assumptions:
     NEED-003   hypothesis, no evidence recorded
     ASSUM-004  "Groups currently abandon at payment" — untested
     ASSUM-009  "Splitting is preferred over one-payer-reimburses" — untested
   Run  product node show ASSUM-004  to see it.
```

```
$ product check

✗ 2 errors, 3 warnings

ERROR  US-021  orphan: no upstream link
       04-backlog/stories/US-021.md:1
       fix: product node link US-021 derives_from <FEAT-ID>

ERROR  KPI-003  no measurable definition ("improve engagement")
       02-strategy/metrics/KPI-003.md:6

WARN   FEAT-004  no success metric (measured_by is empty)
WARN   NEED-002  hypothesis with 7 descendants — substantial work on an unvalidated need
WARN   OBJ-002  no descendants — stated intent nobody is working on
```

```
$ product status

AI PRODUCT OS  ·  SplitPay

Discovery        ██████████  4/4    needs ✓  problem ✓  assumptions ✓  accepted ✓
Strategy         ██████████  4/4    objectives ✓  goals ✓  KPIs ✓  accepted ✓
PRD              ██████░░░░  2/3    composed ✓  cites-only ✓  accepted ✗
Backlog          ███████░░░  17 stories, 15 accepted, 1 orphan
Delivery         ██░░░░░░░░  6 tasks, 2 accepted

Honesty
  3 unvalidated needs underpin 11 stories
  4 assumptions require validation
  2 open questions blocking
  1 feature with no success metric
  2 errors from `product check`
```

### 6.8 Constraints

- **No LLM in the CLI.** No API keys, no model config, no inference cost, no network. `[DECISION D4]`
- **No telemetry.** Consequence: every success metric in §7 is measured by asking humans. Accepted, and named — a product about honest measurement should not instrument its users silently.
- **Filesystem is the only source of truth.** Any index is derived and rebuildable.
- **Git strongly assumed** — it is the undo mechanism, the history, and the safety net for agent writes.
- **IDs are permanent.** Never renumbered, never reused, even after deletion (which is `superseded`/`dropped`, not file removal).
- **Human acceptance is required** for anything to count as complete.
- **Performance budget:** `check` and `why` sub-second at 500 nodes, or they get disabled.

### 6.9 Risks carried into v0.1

```yaml
RISK-001  Fabricated grounding launders guesses into citations         mitigated_by: FEAT-005, US-005, US-009
RISK-002  Ceremony exceeds value; generated once, never reopened       mitigated_by: D1 scope cut, KPI-003
RISK-003  Graph goes stale; confident wrong answers                    mitigated_by: FEAT-003 in CI, status staleness
RISK-004  Review capacity — solo user rubber-stamps agent output       mitigated_by: US-014, small artifacts
RISK-005  Solo user doesn't need traceability at all                   mitigated_by: nothing. This is the bet. R-1 tests it.
RISK-006  Agents corrupt structured files                              mitigated_by: US-002/003 (CLI owns structure), git
RISK-007  Scope creep toward a PM tool                                 mitigated_by: written non-goal in README
```

### 6.10 Acceptance criteria for v0.1 as a whole

1. `product init` → complete OBJ→TASK spine on a real product in <30 min, unassisted.
2. `product why` on any task renders the true chain plus an accurate honesty footer.
3. `product check` catches all 8 error classes on a deliberately broken fixture workspace.
4. `product status` reports no percentage that isn't structurally derived.
5. The four agents run end-to-end in Claude Code, and no agent can create an orphan node.
6. Every agent-created `NEED` carries `hypothesis` + empty evidence unless a human supplied evidence.
7. `packages/core` has zero LLM and zero network dependencies.
8. A second adapter is *describable* from `spec/` without touching `core` (not built — described).
9. The dogfood workspace shows a maintenance ratio (KPI-003) > 0.3 after two weeks.

**#9 is the real gate.** 1–8 are shippable software. #9 is whether the product is true.

---

## 7. Success metrics

### The metric that decides everything

**KPI-003 — maintenance ratio.** Nodes created or edited in week 2+ ÷ nodes at end of week 1. Everything else can look healthy while the product is dead; a workspace that is generated once and never touched again is the definitive failure signal, and it's cheap to observe on the dogfood repo via `git log`.

### Leading indicators (weeks 1–4, dogfooding)

| Metric | Target | How |
|---|---|---|
| Time to first complete spine (KPI-002) | <30 min | Observed sessions |
| `product why` used unprompted | ≥3×/week | Shell history on dogfood repo |
| `check` errors found that the human hadn't noticed | ≥1 in the first week | Direct observation |
| Assumptions promoted `hypothesis → fact` with real evidence | ≥1/month | Graph diff |
| Nodes rejected / edited by the human before acceptance | 20–60% | Too low = rubber-stamping (RISK-004); too high = agents are useless |

### Lagging indicators (post-release, months 1–3)

| Metric | Target | How |
|---|---|---|
| Two-week retention (KPI-001) | ≥40% of spine-completers | Direct interviews, n≥10 |
| Users who say `why` told them something they'd forgotten | ≥50% | Interviews |
| Honesty rate (KPI-004) | 100% | `check` on shared workspaces |
| Second adapter feasible without core changes (KPI-005) | yes | v0.2 spike |

### Explicit non-metrics

**GitHub stars. Downloads. Number of artifacts generated. Lines of markdown produced. Command count. Agent count.** Every one of these can rise while the product fails. Stars in particular are the characteristic vanity signal of ambitious conceptual OSS, and this project is squarely in that risk class — Phase 1 R-C1/P7.

### The honest measurement problem

No telemetry means n is small and self-selected, and the first users are the author. This is a real weakness, not a stylistic choice, and it means **all early metrics are directional, not conclusive** — with the exception of KPI-003 on the dogfood repo, which is objective. Say so in the README.

---

## 8. Traceability audit of this spec

`[FACT]` Verified by hand against Phase 1 §11's rule set:

| Rule | Result |
|---|---|
| Every `US` has an upstream `FEAT` | ✓ 14/14 |
| Every `FEAT` has ≥1 `NEED` and ≥1 `GOAL` | ✓ 8/8 |
| Every `TASK` has an upstream `US` | ✓ 12/12 |
| Every `GOAL` serves an `OBJ` | ✓ 4/4 |
| Every `OBJ` is `measured_by` a `KPI` | ✓ 2/2 |
| Every `FEAT` has a success metric | ⚠ 2 warnings — FEAT-004, FEAT-007 have none |
| No `epistemic_status: fact` without evidence | ✓ |
| Unvalidated foundations | ⚠ **6 needs, all hypothesis, all zero evidence, underpinning 8 features and 14 stories** |

The last row is the true state of this product: **the entire spec rests on six unvalidated needs.** The product's own tooling would flag that loudly, and it should. That is not a flaw in the spec — it is the spec being honest about a real, unavoidable, pre-research condition. Dogfooding (R-1) is what changes it.

---

## 9. First roadmap

### Now — v0.1 "The Spine" (target: 3–4 focused weeks)

The full `OBJ → TASK` spine, 8 CLI commands, 4 agents, Claude Code only, validated by dogfooding on a real product.
**Ships when:** §6.10 criteria 1–8 pass. **Is judged when:** criterion 9 (KPI-003) reports after two weeks of real use.

**R-1 — Validate the core bet, in parallel with building.** The six needs in §6.3 have no evidence. During dogfooding, record which ones actually bite and which never come up. Talk to 5–10 solo product engineers. If NEED-001 (recover the why) turns out to be weaker than NEED-002 (brief the agent), the positioning changes and the roadmap reorders. This is a roadmap item, not a nicety.

### Next — v0.2 "Depth" (only if KPI-003 clears)

Ordered by expected value:
1. **`/product:analyze`** — system analysis: architecture, API contracts, data model, dependencies. The `ADR`/`DEC` node kind graduates to first class, with `TASK → DEC` traceability. Most universally applicable of the deferred stages.
2. **Second adapter** (Codex or Cursor) — proves KPI-005 and the portability claim. Small if `spec/` was built right; a rewrite if it wasn't. Better to learn this early.
3. **`/product:roadmap` + `/product:prioritize`** — `OPP` node kind returns if R-1 says continuous-discovery practice matters to users.
4. **Adopt-an-existing-product flow** — fixes UC-8, the most common real entry path.
5. **Team concerns** — ID collision handling under branching, review/acceptance workflow, `check` as a GitHub Action.

### Later — v0.3 "Closing the loop"

`/product:frontend` and the frontend-architect agent · `EVENT` and `EXPERIMENT` node kinds · `TASK → code → EVENT → KPI` linkage · learnings that supersede assumptions — the moment the loop actually closes and an assumption can be *retired by evidence*. Highest conceptual payoff, highest rot risk; earn it last.

### Someday / explicitly not committed

MCP server · graph visualisation · web UI · Linear/Jira sync · VS Code extension · hosted anything · multi-product workspaces · custom rule DSL.

### The kill criteria

Stated now, while it's cheap to be honest:

> If after four weeks of genuine dogfooding on a real product the maintenance ratio is near zero — if the graph is generated and then abandoned — the concept as specified is wrong, and the correct response is to shrink to whatever *was* used (most likely `why` + `context` alone, over a much smaller node set) rather than to add features.

---

## 10. Dogfooding report — what hurt while writing this in node form

`[FACT]` Observed, not predicted. This is the actual value of writing §6 in the proposed schema.

1. **Deciding `NEED` vs `ASSUM` was genuinely hard,** repeatedly. "Users need to recover the why" is a need; "users will maintain the graph" is an assumption; but the first is *also* an assumption. **Implication:** the discovery agent will get this wrong constantly, and users will too. The schema needs an explicit disambiguation rule — proposed: a `NEED` states what a user requires; an `ASSUM` states what must be *true* for a plan to work. Add it to the agent contracts and the docs. This is a real finding.

2. **Upward-only edges felt right and cost nothing.** Writing `US-014 derives_from FEAT-002` never required touching FEAT-002. Confirms D3 and the T3 agent-safety rationale.

3. **KPIs were the hardest nodes to write honestly.** Every instinct was to write an unmeasurable one. Rule 6 (`KPI` must have a measurable definition) earned its place before a line of code exists — it caught me twice.

4. **The honesty footer changed how I wrote.** Knowing §8 would count unvalidated needs made me *less* willing to inflate the needs list. The mechanism disciplines the author, not just the reader. That is the strongest signal in this document that the core idea works.

5. **11 node kinds is close to the ceiling.** Adding `OPP` and `EPIC` would have made this spec harder, not richer. Confirms the Phase 1 cut.

6. **`FEAT-004` and `FEAT-007` have no success metric** and I couldn't invent honest ones. The tool would warn; the warning is correct; I'm leaving it unresolved rather than fabricating a metric. That's the intended behaviour of the system working on itself.

---

## 11. Open questions carried to Phase 3

1. **[BLOCKING for R-1] Which real product is the dogfooding target?** Its domain determines whether the node kinds fit, whether 11 kinds is too many or too few, and whether UC-3 (agent briefing) or UC-1 (`why`) is the stronger driver.
2. **Language/runtime** for `packages/core` + CLI. `[ASSUMPTION]` Node/TypeScript — best distribution to the target persona (`npx`), best JSON-schema and markdown ecosystem, and it's the environment the persona already has. Go would give a single binary and better startup time. Decide in Phase 3.
3. **Node file format** — YAML frontmatter + markdown body is assumed. Alternative: pure YAML for enumerables. Frontmatter keeps the body human, which matters more.
4. **Acceptance mechanism** — a field edit, a CLI command, or a git-based signal? Must be near-zero friction for a solo user or US-014 becomes theatre.
5. **`--fast` mode** — how much can the discovery agent skip before the output is worthless? Phase 1 Q7, still open.
6. **Where the workspace lives inside the repo** — `product/`, `docs/product/`, `.product/`? Cosmetic but hard to change later.
7. **Licence and commercial intent** — unchanged from Phase 1 Q9; affects README and the `spec/` separation argument.
8. **Name** — Phase 1 Q5, still unanswered. Cheap now, expensive after launch.
