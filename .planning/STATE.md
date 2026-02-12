# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-12)

**Core value:** Users can seamlessly switch between local and SSH workspaces without losing state, and SSH sessions actually load their conversation history.
**Current focus:** Phase 1 complete — ready for Phase 2

## Current Position

Phase: 2 of 4 (Service Infrastructure)
Plan: 3 of 3
Status: Phase 02 complete - ready for Phase 03
Last activity: 2026-02-12 - Completed 02-03 (Context IPC and profile persistence)

Progress: [████░░░░░░] 50.0% (2.0/4 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 4 min
- Total execution time: 0.27 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 Provider Plumbing | 1 | 4 min | 4 min |
| 02 Service Infrastructure | 3 | 12 min | 4 min |

**Recent Trend:**
- Last 5 plans: 4, 4, 6, 2
- Trend: Decreasing (profile persistence was straightforward)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- ServiceContextRegistry in main process (centralizes context lifecycle)
- Snapshot/restore for Zustand state (instant switching without refetching)
- Workspace indicators in sidebar + status bar (VS Code model)
- SSH watchers stay alive in background (real-time updates for all workspaces)
- Added getFileSystemProvider() getter to ProjectScanner for consistent provider access (01-01)
- Threaded provider through all parseJsonlFile() call sites instead of relying on optional parameter fallback (01-01)
- Refactored SubagentDetailBuilder to accept fsProvider and projectsDir as explicit parameters (01-01)
- ServiceContext bundles all session-data services for single workspace isolation (02-01)
- dispose() separate from stop() - stop pauses (reversible), dispose destroys (permanent) (02-01)
- removeAllListeners() called LAST in dispose() to prevent events during cleanup (02-01)
- File watcher event rewiring via exported onContextSwitched callback from index.ts (02-02)
- SSH handler dynamically imports onContextSwitched to avoid circular dependencies (02-02)
- Context ID for SSH uses simple format: ssh-{host} (02-02)
- Destroy existing SSH context on reconnection to same host (02-02)
- [Phase 02-03]: SSH profiles stored in ConfigManager config.ssh.profiles for persistence
- [Phase 02-03]: lastActiveContextId persisted in config for app restart restoration

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1:**
- ✓ RESOLVED: SessionParser, SubagentResolver, and SubagentDetailBuilder now receive FileSystemProvider correctly (01-01)
- Need to test SSH session loading and subagent drill-down thoroughly before proceeding to infrastructure changes (deferred to end-to-end testing)

**Phase 2:**
- ServiceContextRegistry pattern is novel for this codebase (no existing examples) - may need proof-of-concept validation
- EventEmitter listener cleanup must be bulletproof - memory leaks from orphaned listeners can consume 50-100MB per switch

**Phase 3:**
- Snapshot expiration strategy uses 5-minute TTL heuristic - may need tuning based on actual user switching patterns
- Must validate restored tabs against current context (projectIds may not exist in different context)

**Phase 4:**
- Context switcher placement in sidebar needs to fit with existing SidebarHeader without disrupting current layout

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 02-03 (Context IPC and profile persistence) — Phase 02 complete
Resume file: None

---
*Created: 2026-02-12*
*Last updated: 2026-02-12 after completing 02-03-PLAN.md*
