# Plan: Create Custom Sub-Agents for JobVault

## Context

The JobVault project has detailed implementation plans (8 backend + 8 frontend modules) but no code yet. To streamline development, we're creating a team of specialized Claude Code sub-agents — each handling a specific domain (design, frontend, backend, testing) — orchestrated by a Project Manager agent that runs as the main thread via `claude --agent project-manager`.

**Key constraint**: Sub-agents cannot spawn other sub-agents. Only the main-thread PM can delegate via the `Task` tool.

---

## Files to Create

```
.claude/agents/               # NEW directory
  project-manager.md          # Main-thread orchestrator (claude --agent project-manager)
  designer.md                 # Stitch MCP design agent
  frontend.md                 # Nuxt 4 + Nuxt UI v4 implementation
  backend.md                  # NestJS + MikroORM implementation
  frontend-tester.md          # Vitest + Playwright tests
  backend-tester.md           # Jest + Supertest tests
```

**Files to modify**: `progress.md` — add status legend for new markers.

---

## Agent Configuration Matrix

| Agent | Role | Model | Permission | Tools | MCP | Skills | Color |
|---|---|---|---|---|---|---|---|
| `project-manager` | Orchestrator (main thread) | opus | default | Task(designer, frontend, backend, frontend-tester, backend-tester), Read, Glob, Grep | — | — | blue |
| `designer` | UI/UX in Stitch | opus | acceptEdits | Read, Write, Edit, Glob, Grep | stitch | — | purple |
| `frontend` | Nuxt 4 implementation | opus | acceptEdits | Read, Write, Edit, Bash, Glob, Grep | stitch, nuxt-ui-remote | nuxt-ui | cyan |
| `backend` | NestJS implementation | opus | acceptEdits | Read, Write, Edit, Bash, Glob, Grep | — | — | green |
| `frontend-tester` | Frontend QA | opus | acceptEdits | Read, Write, Edit, Bash, Glob, Grep | — | — | orange |
| `backend-tester` | Backend QA | opus | acceptEdits | Read, Write, Edit, Bash, Glob, Grep | — | — | yellow |

All agents get `memory: project` for persistent cross-session learning.

---

## Progress.md Status Protocol

```
- [ ]  Pending (not started)
- [-]  In Progress (agent working on it)
- [T]  To Test (implementation done, ready for testing)
- [x]  Done (tested and passing)
```

**Flow**: `[ ]` → `[-]` (implementation agent starts) → `[T]` (implementation done) → `[x]` (tests pass)

If tests fail: `[T]` → `[-]` (fix) → `[T]` (re-test) → `[x]`

---

## Workflow Diagram

```
User: "implement feature X"
         │
    project-manager
         │
    ┌────┴────┐
    │ Read    │ progress.md, plans/, CONVENTIONS.md
    │ Check   │ dependencies satisfied?
    └────┬────┘
         │
    ┌────┴────┐  (if design missing)
    │designer │ → create/update Stitch screens → update progress.md
    └────┬────┘
         │
    ┌────┴─────────────┐  (parallel if no dependency)
    │                  │
  backend          frontend
    │                  │
  mark [-]           mark [-]
  implement          fetch Stitch design
  mark [T]           implement with Nuxt UI
    │                mark [T]
    │                  │
    └────┬─────────────┘
         │
    ┌────┴─────────────┐
    │                  │
  backend-tester   frontend-tester
    │                  │
  run Jest/Supertest   run Vitest/Playwright
    │                  │
    └────┬─────────────┘
         │
    ┌────┴────┐
    │ Pass?   │──No──→ spawn original agent to fix → re-test
    └────┬────┘
         │ Yes
    mark [x] → next feature
```

---

## Usage

Launch the project manager as the main thread:
```bash
claude --agent project-manager
```

Then give instructions like:
- "Implement the project setup (BE-01 and FE-01)"
- "Implement next" (PM finds the first uncompleted feature with satisfied dependencies)
- "Implement authentication" (PM maps to BE-02 + FE-02)
