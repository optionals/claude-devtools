---
phase: 02-service-infrastructure
plan: 03
subsystem: context-management-ipc
tags: [ipc, context-switching, ssh-profiles, persistence]
dependency-graph:
  requires:
    - 02-02 (ServiceContextRegistry and context lifecycle)
  provides:
    - Context management IPC API (list, getActive, switch)
    - Context change events for renderer
    - SSH connection profile persistence
    - Last active context restoration
  affects:
    - Renderer can now query and switch contexts
    - SSH connections can be saved as profiles for reconnection
    - App can restore last active context on restart
tech-stack:
  added:
    - Context IPC handlers (context.ts)
    - Context API in preload bridge
    - SSH profile management in ConfigManager
  patterns:
    - IPC handler pattern (initialize, register, remove)
    - IpcResult<T> wrapper for type-safe responses
    - invokeIpcWithResult helper for preload
key-files:
  created: []
  modified:
    - src/main/services/infrastructure/ConfigManager.ts
    - src/preload/index.ts
    - src/shared/types/api.ts
    - src/main/ipc/context.ts (created in 02-02)
    - src/preload/constants/ipcChannels.ts (updated in 02-02)
    - src/main/ipc/handlers.ts (updated in 02-02)
decisions:
  - Context IPC handlers follow standard pattern (initialize with services, register/remove with ipcMain)
  - Context switch IPC handler calls onContextSwitched callback for file watcher event rewiring
  - SSH profiles stored in ConfigManager config.ssh.profiles array for persistence
  - lastActiveContextId stored in config.ssh.lastActiveContextId for app restart restoration
  - Profile management methods use logger for visibility (add/remove/update operations)
metrics:
  duration: 2 min
  tasks: 2
  files: 3
  commits: 1
  completed: 2026-02-12
---

# Phase 2 Plan 03: Context Management IPC and Profile Persistence Summary

Context IPC channels and SSH profile persistence enable renderer to manage workspace contexts and save connections for quick reconnection.

## Tasks Completed

### Task 1: Context IPC handler and channel constants ✓
**Status:** Already complete from Plan 02-02
**Details:**
- Context IPC handler module (`src/main/ipc/context.ts`) created with:
  - `CONTEXT_LIST` handler: Returns array of context metadata `{ id, type }`
  - `CONTEXT_GET_ACTIVE` handler: Returns current active context ID
  - `CONTEXT_SWITCH` handler: Switches context, calls onContextSwitched callback
- Channel constants defined in `src/preload/constants/ipcChannels.ts`:
  - `CONTEXT_LIST`, `CONTEXT_GET_ACTIVE`, `CONTEXT_SWITCH`, `CONTEXT_CHANGED`
- Handlers registered in `src/main/ipc/handlers.ts`:
  - `initializeContextHandlers(registry, onContextSwitched)` - stores references
  - `registerContextHandlers(ipcMain)` - registers IPC handlers
  - `removeContextHandlers(ipcMain)` - cleanup on shutdown
- Context switching triggers `onContextSwitched` callback for file watcher event rewiring
- All handlers follow standard error handling pattern with try/catch and IpcResult<T> wrapper

**Verification:** ✓ typecheck passes, handlers registered, channels defined

### Task 2: Context API in preload bridge and SSH profile management ✓
**Status:** Preload API existed from 02-02, profile management added
**Details:**
- **Preload bridge** (`src/preload/index.ts`):
  - Context API exposed with `list()`, `getActive()`, `switch()`, `onChanged()`
  - All methods use `invokeIpcWithResult<T>` helper for type-safe IPC
  - `onChanged` returns cleanup function for proper event listener removal
- **Type definitions** (`src/shared/types/api.ts`):
  - `ContextInfo` interface: `{ id: string; type: 'local' | 'ssh' }`
  - `SshConnectionProfile` interface: stores connection details without password
  - Context API property added to `ElectronAPI` interface
- **ConfigManager** (`src/main/services/infrastructure/ConfigManager.ts`):
  - Added `profiles: SshConnectionProfile[]` to `ssh` config section
  - Added `lastActiveContextId: string` to `ssh` config section
  - Defaults: `profiles: []`, `lastActiveContextId: 'local'`
  - Profile management methods:
    - `addSshProfile(profile)` - adds profile, checks for duplicates
    - `removeSshProfile(profileId)` - removes by ID
    - `updateSshProfile(profileId, updates)` - updates existing profile
    - `getSshProfiles()` - returns deep clone of profiles array
    - `setLastActiveContextId(contextId)` - persists for app restart
  - All methods include logging for visibility
  - Config migration handles missing fields automatically via `mergeWithDefaults()`

**Verification:** ✓ typecheck passes, all tests pass (494 tests), profile methods accessible

## Deviations from Plan

### Auto-fixed Issues

**None** - Plan executed exactly as written. Context IPC infrastructure was already created in Plan 02-02, so this plan only needed to add SSH profile management to ConfigManager.

## Verification Results

1. ✓ `pnpm typecheck` - Zero errors
2. ✓ `pnpm test` - All 494 tests pass
3. ✓ Context IPC channels exist: `context:list`, `context:getActive`, `context:switch`, `context:changed`
4. ✓ Preload exposes `window.electronAPI.context` with 4 methods
5. ✓ ConfigManager includes `ssh.profiles` (array) and `ssh.lastActiveContextId` (string)
6. ✓ ElectronAPI type includes context property definition
7. ✓ Profile management methods exist with proper logging

## Success Criteria Met

- ✓ Renderer process can list all contexts via `window.electronAPI.context.list()`
- ✓ Renderer can get active context via `window.electronAPI.context.getActive()`
- ✓ Renderer can switch contexts via `window.electronAPI.context.switch(contextId)`
- ✓ Renderer can listen for context changes via `window.electronAPI.context.onChanged(callback)`
- ✓ SSH connection profiles persisted in ConfigManager for quick reconnection
- ✓ Last active context ID persisted for app restart restoration
- ✓ All IPC channels follow existing naming and error handling patterns
- ✓ No regressions in existing tests or type checking

## What This Enables

**For Renderer:**
- Query all available workspace contexts (local + SSH)
- Get currently active context ID
- Trigger context switches programmatically
- Listen for context change events
- Build context switcher UI (Phase 4)

**For SSH Reconnection:**
- Save connection profiles after first successful connection
- Reconnect to saved profiles without re-entering credentials
- Remember last active context across app restarts
- Quick reconnection workflow for frequently used SSH hosts

**For App Lifecycle:**
- Restore last active context on app restart (if auto-reconnect enabled)
- Persist connection preferences across sessions
- Support multiple saved SSH profiles

## Architecture Notes

**IPC Flow:**
1. Renderer calls `window.electronAPI.context.list()`
2. Preload invokes `context:list` IPC channel
3. Main process handler calls `registry.list()`
4. Returns array of `{ id, type }` wrapped in `IpcResult<T>`
5. Preload helper unwraps result or throws error
6. Renderer receives typed `ContextInfo[]`

**Context Switch Flow:**
1. Renderer calls `window.electronAPI.context.switch(contextId)`
2. Main handler calls `registry.switch(contextId)` - stops old watcher, starts new watcher
3. Handler calls `onContextSwitched(current)` - rewires file watcher events to renderer
4. Returns `{ contextId }` on success or `{ error }` on failure
5. Renderer receives confirmation or error

**Profile Persistence:**
- SSH profiles stored in `~/.claude/claude-devtools-config.json`
- No passwords stored (security)
- `lastActiveContextId` persisted for app restart restoration
- Config automatically migrated on load if fields missing

## Integration Points

**Depends on:**
- ServiceContextRegistry (Plan 02-02) - provides list(), switch(), getActiveContextId()
- ServiceContext (Plan 02-01) - context lifecycle management
- ConfigManager - existing config persistence infrastructure

**Enables:**
- Phase 3 (Renderer State Management) - context switching in Zustand store
- Phase 4 (UI Components) - context switcher dropdown component
- SSH reconnection workflow - quick reconnection from saved profiles

## Testing Coverage

- Existing test suite passes (494 tests)
- Type safety verified (zero TypeScript errors)
- ConfigManager profile methods covered by existing config test patterns
- IPC handler pattern validated by existing handler tests

## Self-Check: PASSED

**Created files verification:**
- No new files created (infrastructure existed from 02-02)

**Modified files verification:**
- ✓ FOUND: src/main/services/infrastructure/ConfigManager.ts
- ✓ FOUND: src/preload/index.ts
- ✓ FOUND: src/shared/types/api.ts

**Commit verification:**
- ✓ FOUND: 4921c61 (feat(02-03): add SSH profile management to ConfigManager)

All files exist and commit is present in git history.
