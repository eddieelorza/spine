# AI Product OS — Phase 1: Analysis

> Status: **Draft for review**. No code, no scaffolding, no implementation decisions locked.
> Everything here is labelled: `[FACT]` verifiable now · `[ASSUMPTION]` taken to move forward, reversible · `[HYPOTHESIS]` needs evidence · `[DECISION]` proposed, awaiting your approval · `[OPEN]` unresolved.

---

## 1. Product concept assessment

### What this actually is

Stripped of the workflow diagram, the concept is: **a version-controlled, machine-checkable graph of product reasoning that lives next to the code, with AI agents as the authoring interface and a deterministic validator as the referee.**

The 40-step workflow is not the product. The graph is the product. The workflow is one opinionated traversal of it, and the folder tree is a rendering of it. If you keep that ordering straight, the project stays coherent; if you invert it and treat "the folders and the documents" as the product, you have built a document generator with extra steps.

### What is genuinely strong

- **The `why` query is a real primitive.** "Given this ticket, reconstruct the chain of reasoning up to the business objective" is a question every organisation above ~8 people cannot answer today without a meeting. It's demonstrable in 10 seconds, which makes it a good README GIF and a good adoption wedge.
- **Traceability is a checkable property.** Unlike "is this a good PRD?", "does every story reference a user need?" is decidable by a program. That gives the project a deterministic core that doesn't depend on model quality, doesn't cost tokens, and doesn't drift between providers. This is the most valuable structural insight available here.
- **The critic agent is the right anti-slop mechanism**, and it inverts the usual AI-PM value proposition: most tools sell *more artifact*; a critic sells *less unearned confidence*. That is a defensible identity.
- **Timing.** Coding agents now consume repository context well. A structured, ID-addressable reasoning layer in the repo is a directly useful input to them, not just documentation for humans. `[HYPOTHESIS]`

### What is weak or risky in the concept as stated

- **The workflow has ~40 stages.** No individual and no small team will traverse that voluntarily. Presented as a linear pipeline it reads as heavyweight process, which is exactly what the target audience left behind. It needs to be reframed as *a map of node types you may create*, entered at any point, never as *a sequence you must complete*.
- **"Never invent user research" collides with the core loop.** An LLM asked to produce `user-needs.md` from an idea *will* produce plausible needs. Either they are labelled as unvalidated hypotheses with near-zero authority, or the system manufactures fake grounding — and a traceability chain rooted in a fabricated user need is worse than no chain, because it launders a guess into a citation. This is the single biggest product risk and it has to be designed against, not policed by prompt wording alone.
- **The 09-analytics / code-implementation end of the chain is aspirational in v0.1.** Linking `TASK → code → EVENT → KPI` requires either instrumentation integration or manual bookkeeping that will rot. Design the schema so it's expressible; don't promise it works yet.
- **Status percentages are a trap** unless "complete" is defined structurally (see §8/§11). You already flagged this; it's correct and it constrains the design more than it first appears.

### Overall verdict

Concept is sound and differentiated **if** the deterministic graph layer is the centre of gravity and the AI is the authoring surface. It is not differentiated if the AI is the centre and the graph is metadata. Proceed.

---

## 2. Core problem

**Primary problem (the one to build against):**

> Product reasoning is created once, in a medium that cannot be queried, and is destroyed by the act of execution. By the time work reaches a repository, the "why" survives only in the memory of whoever was in the room.

Concretely, the loss happens at three seams:

1. **Discovery → Delivery.** Research decays into a Jira epic title. The need behind it is unrecoverable.
2. **Product → Engineering.** A requirement becomes tickets; the tickets lose the requirement; the architecture decision that served the requirement is recorded nowhere or in a separate wiki nobody reads.
3. **Delivery → Learning.** The feature ships, the metric is not attached to the reasoning, so nobody can say whether the original hypothesis was true. The loop never closes, so the same debate recurs every quarter.

**Secondary problem (increasingly the sharper one):**

> AI coding agents execute with high fidelity and no context about intent. They will build precisely the wrong thing very fast. The bottleneck has moved from *writing code* to *specifying why the code should exist* — and there is no structured, agent-readable place to put that.

`[ASSUMPTION]` The second framing is the more urgent and more fundable one in 2026, and is the one I'd lead with. It's reversible: the same artifact serves both framings.

**What is NOT the problem** (and must not be solved for in v0.1): documentation volume, PRD writing speed, project management, or task tracking. Every one of those has entrenched incumbents and none of them is the wedge.

---

## 3. Target user hypothesis

`[HYPOTHESIS]` — none of this is validated; each line is a claim to test in Phase 2, not a fact.

**Primary (v0.1 — build only for this person):**

> **The Product Engineer.** One person who both decides what to build and builds it. Founder-engineer, technical PM who ships, staff engineer owning a product surface, or an indie/small-team builder. Already lives in a terminal with a coding agent. Already writes markdown in the repo. Feels the pain as *"I made this decision three weeks ago and I no longer remember what it was based on"* and *"my coding agent keeps drifting from the intent."*

Why this user first:
- Zero adoption friction — no second person needs to agree.
- They are the only audience for whom a CLI is a feature rather than a tax.
- They personally feel both ends of the chain, so traceability pays back *within one person's own head*, which is the only place it can pay back with a single user.
- They are the population that stars and adopts OSS dev tooling.

**Secondary (v0.2+, do not design for yet):** technical PMs on a 5–15 person team; small AI-native product teams where an agent does most implementation.

**Explicit non-users for v0.1:** non-technical PMs (need a UI), enterprise/regulated teams (need Jama/Polarion-class rigor, audit, sign-off), design-led orgs, anyone whose real need is Jira replacement.

**The riskiest assumption in this section:** that the *solo* product engineer feels traceability pain strongly enough to pay maintenance cost for it. Traceability's classic value is *organisational* — surviving handoffs between people. A single person may just… remember. `[OPEN — see Q1]`

---

## 4. Main differentiator

**One line:** *Everything else generates documents. This maintains a graph.*

**The three-part moat, in order of strength:**

1. **The reasoning graph is queryable and enforceable, not narrative.** `/product:why US-142` and `/product:check` are the product. A document generator cannot answer either question at any model quality, because the relationships were never captured as data.

2. **Epistemic honesty is a first-class data type.** Assumption, Hypothesis, Decision, Open Question, Fact and Risk are *nodes with IDs and status*, not adjectives in prose. This makes possible things nobody else does: "which shipped features rest on assumptions that were never validated?", "which decision is now contradicted by a learning?". This is where the critic agent gets its teeth, and it's the hardest thing for a PRD generator to bolt on later — it's a schema property, not a prompt.

3. **Provider-agnostic by construction.** `[DECISION — proposed]` The CLI never calls an LLM. Determinism (IDs, validation, graph queries, status) lives in code; intelligence lives in portable prompt packs that any coding agent executes. Consequence: no API keys, no inference cost in the core tool, no vendor lock-in, and "support Codex/Cursor/Gemini" becomes *a different prompt-pack adapter*, not a rewrite. See §13.

**What is explicitly NOT the differentiator** (do not put these in the README): better prompts, more artifact types, prettier documents, breadth of the 40-stage workflow. Breadth is a liability at launch, not an asset.

---

## 5. Competitive / category risks

`[FACT-as-of-knowledge — verify each before writing the README; positioning claims about live products age fast]`

### Adjacent categories

| Category | Examples | How they overlap | Where they leave a gap |
|---|---|---|---|
| **AI PM / PRD tools** | ChatPRD, Kraftful, Zeda, Productboard AI, Notion AI | Generate product docs from an idea | Documents, not graphs. Stop at the product boundary — nothing reaches tasks, architecture, or code. Web-based, PM-audience. |
| **Spec-driven dev for coding agents** | GitHub Spec Kit, Amazon Kiro, BMAD-Method, Task Master, OpenSpec, agent-os | Markdown specs in-repo driving agents; multi-agent PM/architect/dev roles | Start at *"here is a feature to build"*. Upstream (objective → need → opportunity) is absent, and traceability is narrative/implicit rather than validated. |
| **Enterprise requirements traceability** | Jama Connect, Siemens Polarion, IBM DOORS, codebeamer | This is the *actual* conceptual ancestor — the traceability matrix is their core | Heavy, expensive, licence-gated, aimed at safety-critical/regulated industries, no AI authoring, no repo-native workflow. Nobody adopts these voluntarily. |
| **PM tools with hierarchy** | Jira, Linear, Productboard, Airfocus | Objective → epic → story hierarchies | Hierarchy is for reporting, not reasoning; links are optional and rot; discovery/architecture live outside the tool. |
| **Docs-as-code** | ADRs (log4brains), arc42, C4/Structurizr, RFC repos | In-repo, human-readable, decision-preserving | Fragmentary. ADRs capture technical decisions with no product upstream and no cross-artifact validation. |

### The real risks

- **R-C1 — BMAD-Method and Spec Kit class tools are the direct competitors, not ChatPRD.** They are free, already have communities, and already do "agents that produce specs for coding agents." **Mitigation:** compete on the graph and validation layer, not on agent breadth. If a user's summary of this project is "it's like BMAD with more roles", the positioning has failed.
- **R-C2 — Trivially copyable feature surface.** Prompts and folder structures have no moat; a competitor ships `/why` in a weekend. **Mitigation:** the moat, if any, is the *schema + validation rules + the discipline they enforce*, and later a community-shared node/rule library. Accept that the moat is thin early; move on the wedge fast.
- **R-C3 — Platform absorption.** Coding-agent vendors ship built-in spec/planning layers; PM SaaS ships "link your objectives". **Mitigation:** stay a portable open format. If the format is good, absorption looks like adoption rather than extinction.
- **R-C4 — The category label doesn't exist.** "AI Product OS" describes nothing to a stranger; "operating system" is an overloaded, faintly grandiose term. Discovery will be poor. **Mitigation:** lead with the concrete verb everywhere — *traceable product reasoning for AI-assisted teams* — and keep "OS" as a name, never as the explanation. `[OPEN — Q5]`
- **R-C5 — Enterprise traceability has a bad reputation.** For many engineers "traceability matrix" is a synonym for compliance theatre. **Mitigation:** never lead with the word; lead with `why` and with "your agent stops drifting."

---

## 6. Product risks

Ordered by severity. Each has a mitigation that must be visible in the v0.1 design, or the risk is unmitigated.

| # | Risk | Why it's serious | Mitigation to build in |
|---|---|---|---|
| **P1** | **Fabricated grounding.** The system generates plausible personas, needs and research and then treats them as citation targets. Every downstream ID inherits false authority. | Fatal — it inverts the stated purpose and makes the tool actively harmful. Traceability to fiction is worse than no traceability. | Nodes carry mandatory `epistemic_status` + `evidence`. Agent-generated nodes default to `hypothesis` / `unvalidated` and are visually and structurally marked. Validator refuses to report a chain as "grounded" when it terminates in unvalidated nodes. `/product:status` reports *unvalidated foundation count* as prominently as progress. |
| **P2** | **Ceremony exceeds value.** 40 stages, 10 folders, 12 commands. Users try it once, generate 30 files, never open them again. | The most likely way this dies. | v0.1 must produce **few, small artifacts**. Every command must be optional and independently useful. Entry at any node. Ruthless scope cut (§9). |
| **P3** | **Drift and staleness.** The graph is accurate on day 1 and wrong by day 30 because real work happens in Linear/Jira/Slack and the repo copy is never updated. | Kills the value proposition silently — worse, a stale graph gives *confident wrong answers*. | Make updating cheaper than not updating: tiny append-friendly nodes, `product check` in CI, staleness surfaced in `status`. Accept that v0.1 has no external sync and say so honestly. |
| **P4** | **Review capacity is the real bottleneck.** Agents generate faster than a human can meaningfully review. Unreviewed generation becomes rubber-stamping; the human "decision-maker" principle becomes fiction. | Undermines principle #8 ("a human remains the decision-maker"). | Small artifacts by default. Explicit human `status: accepted` transition on nodes — nothing counts as real until a human accepts it. The critic runs *before* acceptance, not after. |
| **P5** | **The solo user doesn't need it.** Traceability pays back across handoffs; one person may hold it in their head. | Invalidates the §3 primary-user hypothesis. | Test explicitly in Phase 2. Fallback framing: the "handoff" for a solo user is *to their coding agent* and *to their own future self across context resets* — which is real, but must be validated, not assumed. |
| **P6** | **Audience split.** PMs won't use a CLI; engineers won't write personas. Aiming at both yields a tool for neither. | Diffuse positioning, weak adoption. | v0.1 targets exactly one persona (§3) and cuts persona/JTBD/journey work entirely from scope (§9). |
| **P7** | **Stars ≠ usage.** Ambitious conceptual OSS frameworks attract stars and near-zero retention. | Vanity metrics hide failure for months. | Define success as retention/depth (§ Phase 2), never stars. Instrument nothing, but ask users directly. |
| **P8** | **False precision in `status`.** A progress bar implies a defined denominator that doesn't exist for open-ended product work. | Erodes trust in the whole tool the first time it's obviously wrong. | Percentages derive only from **structural completeness** (required nodes present, required links resolved, required human acceptance), never from quality judgement. If it can't be computed structurally, show a count, not a bar. |
| **P9** | **Over-generation of IDs.** 200 nodes for a 3-person product; the graph becomes unnavigable and nobody trusts it. | Turns the differentiator into noise. | Only *enumerable* things get IDs (§11). Prose stays prose. Add per-kind soft caps or warnings. |

---

## 7. Technical risks

| # | Risk | Notes | Mitigation direction (decide in Phase 3) |
|---|---|---|---|
| **T1** | **ID allocation under concurrency.** Sequential `US-001` breaks on parallel branches: two people/agents both allocate `US-042`, git merges cleanly, graph is corrupt. | The hardest genuinely-technical problem in the project, and it appears in week one. | Options: (a) sequential + counter file + a `check` rule that detects duplicates and a `fix-ids` remedy; (b) sequential + short random discriminator; (c) slug IDs (`US-split-bill`). Sequential is far more human-usable; the mitigation must be detection, and **IDs must be immutable once assigned** (renumbering breaks every citation, including ones in git history and external tools). `[OPEN — Q3]` |
| **T2** | **Markdown + frontmatter as a database.** Dangling refs, orphans, cycles, type-invalid edges, hand-edited YAML that no longer parses. | Inevitable. Not a reason to add a DB — a reason to make the validator excellent. | The validator is a first-class deliverable in v0.1, not a nice-to-have. Parse errors must be human-legible and point at file:line. Treat the filesystem as source of truth, and any index/cache as derived and rebuildable. |
| **T3** | **Non-deterministic agents mutating structured files.** An LLM asked to "update the backlog" reformats YAML, renumbers IDs, drops links, or rewrites a human's accepted node. | High likelihood, high damage, easy to miss. | Agents should **write content, and call the CLI for structure** (ID allocation, link creation). Prefer append-and-create over rewrite. `check` runs after every agent command. Git is the safety net — v0.1 should require/strongly encourage a git repo. |
| **T4** | **Context window vs. graph size.** By system-analysis stage the agent needs the relevant upstream chain, not the whole workspace. "Read every file" stops working at ~50 nodes. | Determines whether the tool works on a real product or only on demos. | The CLI must expose *scoped context retrieval* — e.g. "give me the full ancestor chain for FEAT-002 as one document". This is a load-bearing capability, not an optimisation: design it in v0.1 even if crude. |
| **T5** | **Duplication of truth.** The same statement lives in `prd.md`, `user-stories.md` and a node file, and the three diverge. | Directly violates "avoid documentation duplication". | Architectural decision required in Phase 3: single source per fact, everything else is a *generated view* or a *citation*. See §11/§12 for the proposed split. |
| **T6** | **Multi-agent-platform portability.** Claude Code skills, Codex, Cursor rules and Gemini CLI have incompatible formats. Building four adapters means maintaining none. | Stated as a principle, so it must be designed for even though it isn't built. | Keep the *source of truth* as platform-neutral agent contracts; generate platform-specific artifacts. v0.1 ships **Claude Code only**, with the neutral format already in place. |
| **T7** | **Human/agent round-trip fidelity.** A human deletes a need; ten stories now dangle. A human renames a story; nothing breaks but the diff is noisy. | Guaranteed to happen. | Deletion should be `superseded_by` / `status: dropped`, not file removal. `check` reports dangling refs as errors with suggested fixes. |
| **T8** | **Validator performance & CI ergonomics.** If `check` takes 20s or emits 400 warnings, it gets disabled. | Slow/noisy validators are always turned off. | Hard budget: sub-second on a few hundred nodes. Error/warning/info severity tiers. Configurable rule set. |
| **T9** | **Schema evolution.** v0.2 adds fields; existing workspaces break. | Early OSS adopters churn on the first breaking change. | Version the workspace schema from day one; additive-only changes; a migration path before the first breaking change ships. |
| **T10** | **Scope creep into a PM tool.** The gravitational pull toward statuses, assignees, sprints, boards. | Turns a sharp tool into a bad Jira. | Written non-goal in the README: *this does not track work; it explains work.* |

---

## 8. MVP proposal (v0.1)

### The honest recommendation: your proposed MVP is still too wide

Your v0.1 lists twelve stages (Idea → … → Development Plan). Every stage added multiplies prompt surface, artifact types, validation rules and review burden — and each one dilutes the single thing that must be undeniable on first run.

**Recommendation `[DECISION — proposed, needs your approval]`: cut v0.1 to one complete vertical spine, deep rather than wide.**

The test v0.1 must pass:

> A product engineer runs it on a real feature they're actually building, and within 30 minutes has a chain from business objective to a technical task where every link is real, `/product:why` on the task tells them something true they'd otherwise have had to reconstruct from memory, and `/product:check` catches at least one gap they hadn't noticed.

### v0.1 scope

**Node kinds (7):** `OBJ` Business Objective · `NEED` User Need · `GOAL` Product Goal · `KPI` Metric · `FEAT` Feature · `US` User Story · `TASK` Technical Task
**Cross-cutting node kinds (4):** `ASSUM` Assumption · `QUES` Open Question · `DEC` Decision · `RISK` Risk

**Narrative artifacts (3, prose that cites IDs):** `idea.md` · `problem-definition.md` · `prd.md`

**Commands (8):**
- `product init` / `/product:new` — create a workspace from an idea
- `/product:discover` — problem definition, needs, assumptions, open questions
- `/product:strategy` — objectives, goals, KPIs
- `/product:prd` — PRD composed from existing nodes, citing IDs (does not invent new ones)
- `/product:stories` — features → stories with acceptance criteria
- `/product:plan` — stories → technical tasks *(replaces the separate analyze/frontend split for v0.1)*
- `/product:review` — the critic
- `product why <ID>` · `product check` · `product status` — **deterministic, no LLM**

### Why this cut

- It contains the **entire spine** — objective all the way to task — so `why` is demonstrable end-to-end. A wider v0.1 that stops at "backlog" cannot demonstrate the core value at all.
- It proves the load-bearing hypotheses: *does the graph get maintained?* and *is `why` valuable?* Roadmap, prioritisation and frontend architecture prove neither; they're breadth, and breadth can be added in v0.2 without redesign because they're just more node kinds on the same schema.
- It is small enough that the artifact set for a real feature is reviewable by one human in one sitting (mitigates P2, P4).

### Deferred to v0.2, in priority order

`/product:analyze` (system analysis: architecture, APIs, data model, dependencies) → `/product:frontend` → `/product:roadmap` + `/product:prioritize` → personas/JTBD/journeys → analytics events + experiments + learnings (closing the loop).

`[ASSUMPTION]` System analysis before frontend analysis, because it's the more universal need — a frontend-architect agent only pays off for teams with a frontend, whereas system implications apply to everyone. Reversible; flip it if your own dogfooding says otherwise.

---

## 9. What to exclude from v0.1

**Hard exclusions — not "later", but "not now, and saying no is the point":**

*Product surface*
- Any web UI, dashboard, or graph visualisation. (The graph is more compelling as a *query answer* than as a picture, and a picture is a month of work.)
- Roadmap, prioritisation frameworks (RICE/WSJF/MoSCoW), estimation, sprints, capacity.
- Personas, JTBD, user journeys, user flows, experience principles — all of §02-users and §03-ux beyond `NEED`. These are the highest-fabrication-risk artifacts (P1) and the least valued by the v0.1 persona.
- Analytics events, experiments, learnings — the loop-closing end. Expressible in the schema, not implemented.
- Multi-product workspaces; one product per repo.
- Templates library, multiple methodologies, configurability of the workflow.

*Technical surface*
- Any database. Any server. Any hosted anything.
- Auth, billing, teams, permissions, cloud sync, collaboration.
- MCP server, VS Code extension, GitHub App.
- Jira / Linear / Notion / Figma integrations. (Highest-frequency future request; still no.)
- Non-Claude-Code agent adapters. Design the neutral format; ship one adapter.
- The CLI calling an LLM directly (no API keys, no model config, no token cost in the tool).
- Automatic extraction of traceability from existing code or git history.
- Graph diffing, time-travel, or history queries beyond what git already gives.
- Plugin system, custom rules DSL, custom node kinds.

**Soft exclusions — build the smallest possible version:**
- `status`: counts and structural completeness only; a bar only where a denominator is genuinely defined.
- `check`: ~8–12 rules, not a rule engine.
- The critic: reports findings; never edits artifacts, never auto-fixes.

---

## 10. Core domain entities

### The central modelling decision

`[DECISION — proposed]` **One generic `Node` type with a `kind` discriminator, not eleven bespoke entity types.**

Rationale: every node needs the same machinery (id, title, kind, status, epistemic status, links, provenance, timestamps). Kind-specific fields are additive. This keeps the validator, the graph walker, `why`, `status` and every agent uniform — and adding `EPIC`, `EVENT`, `ADR` or `COMPONENT` in v0.2 becomes a schema entry rather than new code.

### Node — common shape (conceptual, not a file format)

| Field | Purpose |
|---|---|
| `id` | Permanent, immutable, human-readable — `US-014` |
| `kind` | `OBJ` `GOAL` `NEED` `KPI` `FEAT` `US` `TASK` `ASSUM` `QUES` `DEC` `RISK` |
| `title` | One line, human |
| `status` | Lifecycle: `draft` → `proposed` → `accepted` → `superseded` / `dropped`. **`accepted` requires a human.** |
| `epistemic_status` | `fact` · `assumption` · `hypothesis` · `decision` · `open_question`. Mandatory. This is the anti-slop field. |
| `confidence` | `low` / `medium` / `high` — meaningful only alongside `epistemic_status` |
| `evidence` | Free text + optional sources. Empty evidence on a node claiming `fact` is a validation **error**. |
| `links` | Typed edges to other IDs (below) |
| `provenance` | `author: human \| agent:<name>`, timestamp, command that created it. Lets the critic and the user distinguish generated from authored content. |
| `body` | Human-readable markdown. The part a human actually reads and edits. |

### Kind-specific additions (v0.1)

- **OBJ** — the business outcome. Should link to a `KPI`.
- **GOAL** — product-level goal serving one or more `OBJ`.
- **NEED** — a user need. Carries `who` (the user segment as free text in v0.1 — no persona entity yet) and, critically, `evidence` of how it's known. **Default `epistemic_status: hypothesis` when agent-generated.**
- **KPI** — must have `definition`, `current` (may be `unknown`), `target`, `instrumentation` (may be `not_instrumented`). A KPI without a measurable definition is a validation error — this directly implements your "a KPI is not measurable" critic case as a *rule* rather than a prompt.
- **FEAT** — a solution-space unit. Must link upstream to ≥1 `NEED` and ≥1 `GOAL`.
- **US** — story + acceptance criteria (structured list, so ambiguity can be checked). Must link to ≥1 `FEAT`.
- **TASK** — implementation unit. Must link to ≥1 `US` (or, later, to an `ADR`/`DEC`).
- **ASSUM / QUES / DEC / RISK** — attachable to *any* node. These make the epistemic layer navigable: "show me every assumption underneath EPIC-004."

### Deliberately NOT entities in v0.1

Persona, JTBD, Journey, Flow, Opportunity, Epic, ADR, Component, Route, Event, Experiment, Learning, Dependency.

`[ASSUMPTION]` **`OPP` (Opportunity) and `EPIC` are dropped from v0.1** despite being in your target model. `NEED → FEAT` covers the same ground with one less hop for a small product, and `FEAT → US` covers what `EPIC` would. Both slot back in cleanly later because the graph is generic. Reversible; flag if you disagree — Opportunity is meaningful if you're running continuous-discovery practice (Teresa Torres-style opportunity solution trees), and if that's core to your identity it should arguably stay.

---

## 11. Traceability model

### Edges are typed, and direction is *upward toward the why*

`[DECISION — proposed]` Every node stores its **upward/outward** links only. Downstream links are *derived* by inverting the index. Reason: a single write location per edge means edges can't disagree with each other, and a node can be created without editing its parent (critical for agent safety, T3, and for merge conflicts, T1).

**Edge types (v0.1):**

| Edge | Meaning | Typical use |
|---|---|---|
| `serves` | contributes to a higher-level intent | `GOAL → OBJ`, `FEAT → GOAL` |
| `addresses` | solves a stated need | `FEAT → NEED`, `US → NEED` |
| `derives_from` | decomposition | `US → FEAT`, `TASK → US` |
| `measured_by` | validated by a metric | `OBJ → KPI`, `FEAT → KPI` |
| `assumes` | rests on an assumption | any → `ASSUM` |
| `decided_by` | shaped by a decision | any → `DEC` |
| `questions` | has an unresolved question | any → `QUES` |
| `risks` | carries a risk | any → `RISK` |
| `depends_on` | ordering/technical dependency | `TASK → TASK` |
| `supersedes` | replaces an earlier node | any → same kind |

### The canonical spine (v0.1)

```
OBJ ──measured_by──> KPI
 ^
 │ serves
GOAL <──serves── FEAT ──addresses──> NEED
                  ^                    ^
                  │ derives_from       │ addresses
                  US ──────────────────┘
                  ^
                  │ derives_from
                 TASK
```

Any node may additionally point at `ASSUM` / `QUES` / `DEC` / `RISK`.

### Validation rules (v0.1 target set — this *is* the product)

**Errors (block a clean `check`):**
1. Dangling reference — link to a non-existent ID.
2. Duplicate ID.
3. Type-invalid edge — e.g. `TASK derives_from OBJ`.
4. Cycle in `serves` / `derives_from` / `depends_on`.
5. Orphan `US` or `TASK` — no upstream link (this is *the* traceability rule).
6. `KPI` with no measurable `definition`.
7. `epistemic_status: fact` with empty `evidence`.
8. Malformed node (unparseable, missing required field).

**Warnings:**
9. `FEAT` with no `measured_by` — feature with no success metric.
10. `NEED` with `epistemic_status: hypothesis` that has ≥N descendants — *building substantially on an unvalidated need*. (The most valuable warning in the set.)
11. `OBJ` / `GOAL` with no descendants — stated intent nobody is working on.
12. `US` with zero acceptance criteria, or criteria containing hedge language.
13. Node in `draft` for > N days (staleness).
14. Node linked to a `superseded` node.

Rules 1–8 are pure graph properties: fast, deterministic, model-free. Rule 12's linguistic half and everything subtler belongs to the **critic agent**, whose findings are advisory and never mutate the graph.

### `/product:why <ID>` — semantics

Walk upward from the node following `serves` / `addresses` / `derives_from` to all roots, then attach `measured_by` metrics and every `ASSUM` / `QUES` / `RISK` encountered anywhere on the path. Render as the chain in your example — **plus** an honesty footer:

```
US-142  Allow customers to split payment
  derives_from   FEAT-002  Split Bill
    addresses    NEED-003  Groups need independent payment methods   [hypothesis · low confidence]
    serves       GOAL-001  Reduce payment friction
      serves     OBJ-001   Increase completed restaurant transactions
                             measured_by  KPI-002  Checkout completion rate

⚠  This chain rests on 1 unvalidated need (NEED-003) and 2 open assumptions (ASSUM-004, ASSUM-009).
```

That warning line is the product's soul. It's what makes this a reasoning system rather than a document generator, and it should appear in the README's first screenshot.

### Storage `[DECISION — proposed, resolves T5]`

- **Enumerable things become node files** — one small file per node, e.g. `05-backlog/stories/US-014.md`, with YAML frontmatter + markdown body. Single source of truth. Small git diffs, low merge-conflict surface, human-editable, agent-safe.
- **Narrative artifacts stay prose** — `prd.md`, `problem-definition.md` are human-readable documents that **cite** IDs and never redefine them. They are context, not graph.
- **Aggregate views are generated** — `user-stories.md` etc., if produced at all, are `<!-- generated -->` renderings of node files, never hand-edited.
- **The index is derived and disposable** — a JSON/YAML index rebuilt by `check`, gitignored or committed but always regenerable from the node files. Never authoritative.

This is the one architectural choice that makes "avoid documentation duplication" actually achievable rather than aspirational, and it is the biggest deviation from your §5 workspace sketch — worth an explicit decision.

---

## 12. Proposed repository structure

Two separate structures. Conflating them is a common early mistake.

### A. The open-source project repo

```
ai-product-os/
├── README.md                      # positioning per §9 of your brief
├── docs/
│   ├── phase-1-analysis.md        # this document
│   ├── concepts/                  # traceability model, node kinds, epistemic model
│   ├── decisions/                 # ADRs for the project's own choices
│   └── guides/
├── spec/                          # ← the portable, tool-agnostic heart
│   ├── schema/                    # node + edge schemas, workspace version
│   ├── rules/                     # validation rules as data, not code
│   └── agents/                    # neutral agent contracts (§13)
├── packages/
│   ├── core/                      # parse · graph · validate · query   (no LLM, no I/O opinions)
│   └── cli/                       # product init/check/why/status/context
├── adapters/
│   └── claude-code/               # generated: skills, subagents, commands
├── templates/                     # workspace scaffold + node templates
├── examples/
│   └── splitpay/                  # a complete worked example — the best documentation
└── tests/
```

`[ASSUMPTION]` `spec/` is deliberately separate from `packages/` and is the primary artifact of the project. If someone wants to reimplement AI Product OS in Go for Gemini CLI, `spec/` is what they need and the rest is one implementation. This makes the provider-agnostic principle structural rather than rhetorical.

### B. The generated product workspace (v0.1 only)

```
my-product/
├── .product/
│   ├── config.yaml            # product name, schema version, rule config
│   ├── index.json             # derived, regenerable
│   └── counters.yaml          # ID allocation
├── 00-context/
│   └── idea.md                # narrative
├── 01-discovery/
│   ├── problem-definition.md  # narrative
│   ├── needs/                 # NEED-*.md
│   ├── assumptions/           # ASSUM-*.md
│   └── questions/             # QUES-*.md
├── 02-strategy/
│   ├── objectives/            # OBJ-*.md
│   ├── goals/                 # GOAL-*.md
│   └── metrics/               # KPI-*.md
├── 03-product/
│   ├── prd.md                 # narrative, cites IDs
│   └── features/              # FEAT-*.md
├── 04-backlog/
│   └── stories/               # US-*.md
├── 05-delivery/
│   └── tasks/                 # TASK-*.md
└── decisions/                 # DEC-*.md, RISK-*.md (cross-cutting, unnumbered folder)
```

Your full 00–09 numbering returns in v0.2+ as new node folders. Numbering is kept for readability, but **nothing in the tooling should depend on folder position** — the `kind` field is authoritative, so a user can reorganise freely.

---

## 13. Proposed agent architecture

### The core decision `[DECISION — proposed]`

**Agents never talk to each other. They communicate through the workspace.** (Blackboard pattern.) No orchestration layer, no message passing, no agent-to-agent protocol.

Consequences, all good:
- Every intermediate state is a file a human can read, edit and veto → satisfies "a human remains the decision-maker" structurally.
- Any agent on any platform can participate — the interface is the filesystem, not an SDK.
- No orchestration framework to build or maintain in v0.1.
- The human sits at every seam by default, which is exactly where P4 (review capacity) needs them.

### The second core decision `[DECISION — proposed]`

**Split determinism from intelligence, hard:**

| Deterministic — `packages/core` + CLI, no LLM ever | Intelligent — agent prompt packs |
|---|---|
| ID allocation | Problem framing |
| Parsing & schema validation | Need articulation |
| Graph construction, `why`, `check`, `status` | Feature/story/task drafting |
| Scoped context retrieval | Critique & gap-finding |
| Rendering & templates | Judgement, phrasing, trade-offs |

The coding agent calls the CLI. The CLI never calls a model. This is what makes provider-agnosticism free rather than expensive, and it means `why`/`check`/`status` are exactly as reliable as ordinary software.

### Agent contract format

Each agent is a platform-neutral markdown file in `spec/agents/` with structured frontmatter declaring:

- **role & responsibilities** (your §3 lists, largely as given)
- **reads** — which node kinds it needs as input
- **writes** — which node kinds it may create (a hard whitelist; the CLI can enforce it)
- **preconditions** — what must exist before it can run (e.g. `product-manager` requires ≥1 `NEED`)
- **required links** — every node it creates must carry these edges (structural anti-orphan enforcement, not a prompt request)
- **epistemic defaults** — e.g. `product-discovery` writes `NEED` at `hypothesis` unless the human supplies evidence
- **done criteria** — what "this agent finished" means, feeding `status`
- **prohibitions** — e.g. *never assert `fact` without user-supplied evidence*; *never modify a node with `status: accepted`*; *never create a node without an upstream link*

These compile into `adapters/claude-code/` (subagents + skills + slash commands). v0.1 ships that one adapter; the neutral format exists from day one so the second adapter is a build step, not a rewrite.

### The five agents

Per your brief, with v0.1 adjustments:

1. **product-discovery** — writes `NEED`, `ASSUM`, `QUES`, `RISK`, and the `problem-definition.md` narrative. Hard prohibition on asserting research it didn't receive.
2. **product-manager** — writes `OBJ`, `GOAL`, `KPI`, `FEAT`, `US`, and the `prd.md` narrative. The PRD **composes from existing nodes and cites them**; it may not introduce ungrounded new claims. This one constraint is most of what separates this from a PRD generator.
3. **system-analyst** — v0.1: writes `TASK` and `RISK`/`DEC`. Full architecture/API/data-model responsibilities land in v0.2.
4. **frontend-architect** — **deferred entirely to v0.2.** Defining its contract now is useful; shipping it isn't.
5. **product-critic** — reads everything, writes **nothing** to the graph. Emits a review report: inconsistencies, unsupported claims, traceability gaps, ambiguous acceptance criteria, missing metrics, assumptions treated as facts. Its findings reference node IDs so a human can act on them precisely. It is the only agent explicitly allowed to say "this is wrong, stop."

`[ASSUMPTION]` Four agents in v0.1 (discovery, PM, analyst, critic) rather than five.

### Handoff protocol

An agent's run ends by writing/updating nodes, then the CLI runs `check` and the run reports what it created and what remains unresolved. The next agent starts by loading scoped context from the CLI, not by reading the whole workspace (T4). The human accepts nodes between stages; nothing advances on agent confidence alone.

---

## 14. Proposed commands

**Deterministic (CLI, no model, callable by humans and by any agent):**

| Command | Purpose |
|---|---|
| `product init` | Scaffold a workspace |
| `product check` | Run validation rules; exit non-zero on errors. CI-ready. |
| `product why <ID>` | Upward reasoning chain + epistemic warnings |
| `product status` | Structural completeness + honesty counters |
| `product node new/show/link` | Safe node + edge creation (this is what agents call, so they never hand-write IDs) |
| `product context <ID>` | Scoped ancestor/descendant bundle for agent consumption (T4) |
| `product list --kind --status` | Query |

**Agent-driven (skills / slash commands):**

| Command | Agent | v0.1? |
|---|---|---|
| `/product:new` | scaffold + interview | ✅ |
| `/product:discover` | product-discovery | ✅ |
| `/product:strategy` | product-manager | ✅ |
| `/product:prd` | product-manager | ✅ |
| `/product:stories` | product-manager | ✅ |
| `/product:plan` | system-analyst | ✅ |
| `/product:review` | product-critic | ✅ |
| `/product:why`, `/product:status`, `/product:check` | thin wrappers over the CLI | ✅ |
| `/product:users` (personas, JTBD) | product-discovery | v0.2 |
| `/product:roadmap`, `/product:prioritize`, `/product:backlog` | product-manager | v0.2 |
| `/product:analyze` (architecture, APIs, data model) | system-analyst | v0.2 |
| `/product:frontend` | frontend-architect | v0.2 |

`[ASSUMPTION]` `/product:backlog` is dropped as a separate v0.1 command — the backlog *is* the set of `US` nodes; a command that produces a second representation of it is duplication (T5). `product list --kind US` covers it.

### `product status` — defining "complete"

Never a quality judgement. Only these, per stage:

- **required nodes exist** (e.g. Strategy needs ≥1 `OBJ`, ≥1 `GOAL`, ≥1 `KPI`)
- **required links resolve** (every `FEAT` has upstream `NEED` + `GOAL`; every `US` has a `FEAT`; every `TASK` has a `US`)
- **human acceptance** (nodes at `status: accepted`, not `draft`)
- **no blocking errors** in that stage's nodes

A stage is `n/m` on those checks. Where a denominator is genuinely undefined (e.g. "have we discovered enough?"), **show a count and a warning, never a bar**. And the honesty block is mandatory output:

```
3 unvalidated needs underpin 11 stories
4 assumptions require validation
2 open questions blocking
0 features without a success metric
```

---

## 15. Open questions

Marked **[BLOCKING]** where I'd want your answer before Phase 2/3 output could be trusted; the rest I can proceed on with the labelled assumptions above.

1. **[BLOCKING] Is the primary user really the solo product engineer, or a small team?** This changes the MVP more than any other choice: solo → optimise for speed and low ceremony, and traceability's payoff is "your agent and your future self"; team → optimise for review, acceptance and handoff, and merge/ID concurrency (T1) becomes a day-one problem rather than a v0.2 one. My proposal assumes **solo/small**.

2. **[BLOCKING] Are you building this to dogfood on a real product of your own?** If yes, the fastest correct path is: build the thin spine, run it on that product for two weeks, and let reality cut the scope. If it's a pure OSS artifact with no dogfooding target, P2 and P3 are much harder to detect early and the design should lean more conservative.

3. **ID scheme under branching** — sequential-and-detect-collisions, sequential-with-discriminator, or slugs? Affects usability (`US-142` is far nicer to say out loud than `US-a7f3`) versus safety. Resolvable in Phase 3; I lean sequential + detection, with immutability as an absolute rule.

4. **Do `OPP` (Opportunity) and `EPIC` belong in v0.1?** I've cut both (§10). If continuous discovery / opportunity-solution-tree practice is central to the project's identity, `OPP` should come back in — that's a positioning call, not a technical one.

5. **Does the name survive contact with strangers?** "AI Product OS" is memorable but explains nothing and inherits some "OS" grandiosity. Not blocking, but worth deciding before the README exists, because renaming after launch is expensive.

6. **Should the workspace live in the product's own code repo, or a separate repo?** Same-repo makes the reasoning available to coding agents and keeps it near the code (strongly preferred for the §2-secondary framing). Separate-repo suits PM-led adoption. My assumption: **same repo, in a `product/` directory**, with separate-repo supported but not optimised for.

7. **How much should v0.1 interview the user?** A discovery agent that asks 15 questions produces far better grounding and much worse first-run experience. Probable answer: a short interactive pass with an explicit `--fast` escape that marks everything it invents as `hypothesis`. Reversible.

8. **Is the critic a separate command or an automatic step?** Automatic is more valuable and more annoying. My assumption: separate command in v0.1, with automatic invocation offered later.

9. **What is the licence, and is there any commercial intent behind the OSS?** Doesn't change v0.1 code, but it changes the README, the contribution model, and whether the `spec/` split matters as much as I've argued.

10. **Non-blocking, worth naming:** how does this behave in a repo that already has a product and a backlog elsewhere? "Adopt an existing product" is a much harder and much more common case than greenfield, and v0.1 will handle it badly. That's acceptable for v0.1 — but it should be an acknowledged limitation in the README rather than a surprise.

---

## 16. Recommended next step

**Do not go straight to Phase 2.** Two things first, in this order:

1. **Answer Q1 and Q2** (§15). They're two sentences from you and they determine whether the Phase 2 PRD is written for the right person against a real validation loop.

2. **Approve, amend or reject the five proposed `[DECISION]`s**, since Phase 2 and 3 are built on them:
   - **D1** — v0.1 is one deep vertical spine (`OBJ → TASK`), not the twelve-stage flow (§8).
   - **D2** — One generic `Node` with a `kind` discriminator (§10).
   - **D3** — Enumerable things are one-file-per-node; narrative docs cite IDs and never redefine them; aggregates are generated (§11).
   - **D4** — The CLI never calls an LLM; determinism and intelligence are hard-split (§13).
   - **D5** — Agents communicate only through the workspace; no orchestration layer (§13).

Then **Phase 2 — Product specification**, which I'd dogfood: write the v0.1 product spec *as an AI Product OS workspace*, by hand. Objectives, goals, KPIs, needs, features, stories and tasks for this project itself, in the proposed node format. That does three things at once — it produces the Phase 2 deliverables you asked for, it stress-tests the schema against a real product before a line of code exists, and it becomes `examples/` and the README's demo. If the format is annoying to write by hand for this project, it will be annoying for everyone, and we'll find that out for free.

One thing I'd flag as the thing most likely to be wrong in this analysis: **§3, the target-user hypothesis.** Everything downstream — CLI-first, solo-optimised, low-ceremony — rests on it, and it is currently a guess. Phase 2 should treat validating it as a task, not a preamble.
