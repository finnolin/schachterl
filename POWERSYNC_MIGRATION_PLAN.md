# PowerSync Migration Plan

## Overview

`schachterl` is migrating from its custom local SQLite + change-log synchronization layer to PowerSync.

The target is:

- PowerSync-owned local SQLite on web and Tauri
- PowerSync Sync Streams for server-to-client replication
- Better Auth for application sessions
- A short-lived JWT credential endpoint for PowerSync
- A SvelteKit upload endpoint for PowerSync CRUD operations
- PostgreSQL as the source of truth
- Drizzle as the type-safe query layer over PowerSync

The migration is in progress: PowerSync dependencies, Tauri integration, Docker service configuration, PostgreSQL replication setup, secure membership-scoped Sync Streams, the complete client schema, and the user-specific PowerSync database lifecycle are in place. The PowerSync connector, backend upload/auth endpoints, native Tauri sync connector, and old custom sync layer cleanup remain.

---

## Current state

### Already present

- `@powersync/web`
- `@powersync/tauri-plugin`
- `@powersync/drizzle-driver`
- Tauri PowerSync Rust plugin and capability
- Self-hosted PowerSync service in `docker-compose.yml`
- PostgreSQL logical replication setup in `pgsetup/powersync.sql`
- `powersync/service.yaml`
- `powersync/sync-config.yaml` with `edition: 3`
- Preliminary `PowerSyncDatabase` instances in `src/lib/local/db/index.ts`
- Preliminary PowerSync schema support in `src/lib/local/db/schema.ts`

### Still active and must be replaced

- `@tauri-apps/plugin-sql` and `sqlocal` remain installed but are no longer used by `DatabaseService`.
- `drizzle-orm/sqlite-proxy` and the old proxy module remain in the repository but are no longer the active database path.
- Client `change` outbox table, temporarily retained as a local-only compatibility table.
- `SyncClient` push/pull implementation.
- Custom `/api/v1/sync/push` and `/api/v1/sync/pull` endpoints.
- SSE poke connection and heartbeat/watchdog logic.
- Manual cursor and in-flight handling.
- Manual remote change application.
- Repository `recordChange()` calls.
- `synced`, `in_flight`, `base_version`, and patch-coalescing logic.

### Current transitional state

`src/lib/local/db/index.ts` now opens a user-specific PowerSync database for web and Tauri and wraps it with Drizzle. The database is initialized locally, but synchronization is not connected yet. Legacy `app_meta` and `change` tables are temporarily declared local-only so the old sync code can be removed separately.

---

## Target architecture

```text
Better Auth session
        │
        ▼
PowerSync connector
  ├─ fetchCredentials()
  └─ uploadData()
        │
        ├──────────────► SvelteKit upload endpoint
        │                       │
        │                       ▼
        │                   PostgreSQL
        │                       │
        │                 logical replication
        │                       │
        ▼                       ▼
PowerSync service ◄──────────────
        │
        ▼
PowerSync local SQLite
        │
        ├─ Drizzle driver for imperative/type-safe queries
        └─ PowerSync watches for reactive updates
```

PowerSync owns:

- Local SQLite creation
- Local schema creation/update
- Download sync
- Upload queue
- Retry behavior
- Sync cursor/checkpoint state
- Local write tracking
- Reactive query invalidation

The application owns:

- PostgreSQL writes through an authenticated backend endpoint
- Authorization and conflict handling
- PowerSync JWT issuance
- Sync Stream definitions
- UI state and domain repositories

---

# Migration phases

## Phase 0 — Confirm deployment and authentication contract

**Status: direction confirmed; authentication implementation remains.**

The repository target is:

- Self-hosted PowerSync in Docker
- PostgreSQL source database
- Existing SvelteKit server as custom backend
- Better Auth for application sessions
- Custom PowerSync JWT credential endpoint
- `uploadData()` calling a SvelteKit upload endpoint

Before implementing the auth portion, confirm:

1. PowerSync Cloud or self-hosted
2. Existing PowerSync instance or local Docker only
3. Whether Better Auth will issue the PowerSync JWT directly or delegate to another auth service
4. Whether the current inline RSA public key is development-only

For production, replace the inline key in `powersync/service.yaml` with a proper JWKS/private-key setup. Never commit a private signing key.

Follow the PowerSync skill guardrails:

- Use the PowerSync CLI for PowerSync operations where possible.
- Do not deploy or mutate an instance without confirming the target.
- Existing-project default scope is `sync-config` only unless infrastructure changes are explicitly authorized.
- Keep credentials in `.env`.

---

## Phase 1 — Freeze and document the data model

**Status: complete at the decision/schema level.**

The deletion policy, global user/reference data policy, membership access scope, timestamp representation, and relationship cascade behavior have been decided and reflected in the schemas/config.

Compare:

- `src/lib/server/db/schema.ts`
- `src/lib/local/db/schema.ts`
- `powersync/sync-config.yaml`

Create and maintain a table matrix:

| Table | Server Postgres | Local Drizzle | PowerSync schema | Sync stream | Writable |
|---|---:|---:|---:|---:|---:|
| `user` | yes | yes | no | no | likely no |
| `space` | yes | yes | yes, incomplete | yes, unsafe | yes |
| `space_user` | yes | yes | no | no | yes |
| `resource_type` | yes | yes | no | no | yes |
| `resource` | yes | yes | yes | partial | yes |
| `space_resource_type` | yes | yes | no | no | yes |
| `relationship_type` | yes | yes | no | no | yes |
| `relationship` | yes | yes | no | no | yes |
| `media` | yes | yes | no | no | probably yes |

Verify for each table:

- Primary key and column names
- Timestamp representation
- Boolean representation
- JSON representation
- Soft-delete behavior
- Foreign key dependencies
- User/space authorization scope
- Whether it is client-writable

---

## Phase 2 — Define the complete PowerSync and Drizzle schemas

**Status: complete for the current transition.**

The local Drizzle schema now covers all nine domain tables, `ps_schema` is derived from that complete schema, timestamps use text ISO values, and legacy `app_meta`/`change` tables are temporarily local-only. The old migration history is intentionally not being carried forward.

PowerSync schema rules:

- Do not define `id` in a PowerSync `Table`; PowerSync creates it as `TEXT PRIMARY KEY`.
- Dates should use a consistent ISO text or integer representation.
- Booleans are integer `0`/`1`.
- JSON fields should be stored as serialized text unless the current physical schema already establishes another compatible representation.
- PowerSync schema and Drizzle schema must stay aligned.
- PowerSync does not use the current custom Drizzle migration runner for synced tables.

Recommended files:

```text
src/lib/local/db/
  powersync-schema.ts   # PowerSync Schema/Table definitions
  drizzle-schema.ts     # Drizzle sqliteTable definitions
  index.ts              # PowerSync database singleton + Drizzle wrapper
  connector.ts          # fetchCredentials/uploadData connector
```

The domain `drizzle_schema` now includes:

```ts
const drizzle_schema = {
  user,
  space,
  space_user,
  space_resource_type,
  resource_type,
  resource,
  media,
  relationship_type,
  relationship
};
```

The legacy `change` and `app_meta` tables are retained temporarily as local-only compatibility tables and will be removed with the old sync layer.

Likely local-only state:

- Sidebar settings
- Selected server
- Client ID
- Local preferences
- UI focus
- Cached auth metadata

Keep these in Tauri Store/localStorage or model them as PowerSync local-only tables. Do not sync them as domain tables.

---

## Phase 3 — Secure and expand Sync Streams

**Status: implemented locally; deployment/validation still pending.**

The stream now globally syncs the selected public user columns, resource types, and relationship types, while scoping spaces and space-owned data through `space_user` membership. `resource` and `media` rows are not filtered by `deleted_at`, allowing soft-delete updates to sync.

Current `powersync/sync-config.yaml`:

```yaml
config:
  edition: 3

streams:
  test:
    auto_subscribe: true
    query: SELECT * FROM space
```

This is unsafe because it exposes every space to every authenticated client.

A first user-scoped design could be:

```yaml
config:
  edition: 3

streams:
  user_data:
    auto_subscribe: true
    queries:
      - |
        SELECT *
        FROM "user"
        WHERE id = auth.user_id()
      - |
        SELECT s.*
        FROM space s
        INNER JOIN space_user su ON su.space_id = s.id
        WHERE su.user_id = auth.user_id()
      - |
        SELECT su.*
        FROM space_user su
        WHERE su.user_id = auth.user_id()
      - |
        SELECT srt.*
        FROM space_resource_type srt
        INNER JOIN space_user su ON su.space_id = srt.space_id
        WHERE su.user_id = auth.user_id()
      - |
        SELECT r.*
        FROM resource r
        INNER JOIN space_user su ON su.space_id = r.space_id
        WHERE su.user_id = auth.user_id()
      - |
        SELECT rt.*
        FROM resource_type rt
        WHERE rt.deleted_at IS NULL
      - |
        SELECT rel.*
        FROM relationship rel
        INNER JOIN space_user su ON su.space_id = rel.space_id
        WHERE su.user_id = auth.user_id()
      - |
        SELECT relt.*
        FROM relationship_type relt
        WHERE relt.deleted_at IS NULL
      - |
        SELECT m.*
        FROM media m
        INNER JOIN space_user su ON su.space_id = m.space_id
        WHERE su.user_id = auth.user_id()
```

This is a starting point only. Verify:

- Whether global resource types are intended for all users
- Whether deleted rows must be synced as tombstones
- Whether `user` should be synced
- Whether relationship types need membership filtering
- Whether all rows need a `space_id` access guard

Use one stream with multiple queries for tables with the same scope to avoid unnecessary stream/bucket duplication.

Before deployment, validate the configuration with the PowerSync CLI and confirm the target instance.

---

## Phase 4 — Implement the PowerSync connector

**Status: not started.**

Add:

```text
src/lib/local/sync/powersync-connector.ts
```

The connector needs:

1. `fetchCredentials()`
2. `uploadData()`

### Credential endpoint

Suggested route:

```text
src/routes/api/v1/powersync/credentials/+server.ts
```

The route should:

1. Read the Better Auth session.
2. Derive the user ID from the session.
3. Issue a short-lived PowerSync JWT.
4. Return the PowerSync endpoint and token.

Do not accept an arbitrary `user_id` from the client.

Token claims must include at least:

- `sub`
- `aud`
- `iat`
- `exp`
- `kid` when using JWKS

Suggested response:

```ts
type PowerSyncCredentialsResponse = {
  token: string;
  endpoint: string;
  expires_at?: string;
};
```

### Upload endpoint

Suggested route:

```text
src/routes/api/v1/powersync/upload/+server.ts
```

The endpoint should:

1. Authenticate the Better Auth session/JWT.
2. Validate the operation table against an allowlist.
3. Validate operation columns against an allowlist.
4. Authorize the user for every affected row and space.
5. Apply writes synchronously in PostgreSQL.
6. Return 2xx for validation/domain errors so the queue does not permanently block.
7. Return 5xx for transient database/server errors so PowerSync retries.

PowerSync operations:

| Operation | Backend action |
|---|---|
| `PUT` | Insert/upsert |
| `PATCH` | Partial update |
| `DELETE` | Soft delete or hard delete according to policy |

Call `transaction.complete()` only after the server commit succeeds.

Do not interpolate arbitrary client-provided table names into SQL.

Reuse server repositories and authorization rules where possible instead of bypassing them.

---

## Phase 5 — Replace local database creation

**Status: implemented locally; synchronization is not connected yet.**

`src/lib/local/db/index.ts` now creates a user-specific PowerSync-owned database for both web and Tauri, uses the Tauri app-data directory on native, and wraps the active database with the PowerSync Drizzle driver. Per-user filenames are intentionally retained so each user has an isolated local database and sync state.

Replace the old lifecycle in `src/lib/local/db/index.ts` with one PowerSync-owned database.

Conceptually:

```ts
export const powerSyncDb = new PowerSyncDatabase({
  database: {
    dbFilename: `schachterl-${userId}.sqlite`
  },
  schema: powerSyncSchema
});

export const db = wrapPowerSyncWithDrizzle(powerSyncDb, {
  schema: drizzleSchema
});
```

After the connector is implemented, connect the active user-specific database:

```ts
powerSyncDb.connect(connector);
await powerSyncDb.waitForFirstSync();
```

The active database path no longer:

- Opens `@tauri-apps/plugin-sql`
- Creates SQLocal
- Creates a `sqlite-proxy`
- Applies SQL migrations manually

PowerSync owns schema application for synced tables. The old packages and proxy module remain only until dependency cleanup.

### User switching and logout

The current implementation retains one database file per user. On a user switch, disconnect and close the old database before opening the new user’s database:

```ts
await powerSyncDb.disconnect();
await powerSyncDb.close();
```

Use `disconnectAndClear()` when the user explicitly wants local data removed or when a shared-device security policy requires it. Never use the old user’s database instance for the new user.

---

## Phase 6 — Rewrite AppContext boot flow

**Status: not started.** The database type and local initialization path were updated, but authentication-driven PowerSync connection and first-sync gating are still pending.

Current boot flow:

```text
store.initialize()
→ resolve local/remote mode
→ create per-user DB
→ run local migrations
→ initialize manual sync
→ initialize queries
```

Target flow:

```text
store.initialize()
→ initialize Better Auth
→ resolve authenticated user
→ create PowerSync connector
→ connect PowerSync once
→ optionally wait for first sync
→ initialize queries
```

Likely files:

- `src/lib/local/app/app-context.svelte.ts`
- `src/lib/local/auth/auth.svelte.ts`
- `src/lib/local/app/store.svelte.ts`

Remove assumptions that:

- `DatabaseService.initialize()` is the eventual database lifecycle rather than a temporary compatibility wrapper
- The PowerSync connector should be created only after Better Auth resolves the user
- Web should connect through the JavaScript connector and Tauri through the native Rust connector

A truly unauthenticated local-only mode would need a separate policy because PowerSync credentials require a user identity. Decide whether to remove that mode or implement it as an explicitly separate local-only database.

---

## Phase 7 — Rewrite repositories

**Status: not started.** Query code remains compatible through the Drizzle wrapper, but repository writes still record custom changes.

Most query code can remain conceptually similar if the Drizzle wrapper is retained.

Remove calls to:

```ts
new Changes().recordChange(...)
```

Also remove explicit handling of:

- `version`
- `base_version`
- `synced`
- `in_flight`
- Cursor updates
- Change coalescing
- Manual push/pull state

Writes should go directly through the PowerSync-backed Drizzle database:

```ts
await db.insert(resource).values(values);
```

PowerSync automatically records the write in its internal upload queue.

Use PowerSync transactions for related writes:

```ts
await powerSyncDb.writeTransaction(async (tx) => {
  // related writes
});
```

Use transactions for:

- Creating a space plus owner membership
- Creating resources plus relationships
- Cascading deletes
- Updating resource ordering and parent relationships

---

## Phase 8 — Replace manual reactivity

**Status: not started.**

Current reactivity:

```text
write
→ notify('resources')
→ LiveQuery.refetch()
```

Eventually replace this with PowerSync-backed query watching.

Files to replace or reduce:

- `src/lib/local/utils/live-query.svelte.ts`
- `src/lib/local/utils/invalidation.ts`
- `src/lib/local/repositories/Changes.ts`

Possible staged approach:

1. Keep `LiveQuery` temporarily.
2. Make it subscribe to PowerSync query/watch notifications.
3. Remove manual invalidation calls progressively.
4. Centralize watched queries around PowerSync.
5. Dispose listeners when components/effects stop reading them.

Do not use a separate raw SQLite connection for watches. Writes outside PowerSync bypass its change tracking and reactivity.

---

## Phase 9 — Remove the old sync layer

**Status: not started.** Complete this only after PowerSync upload/download and the vertical slice are verified.

Once PowerSync upload/download works, remove or archive:

```text
src/lib/local/sync/index.ts
src/lib/local/sync/api.ts
src/lib/local/sync/poke-client.svelte.ts
src/lib/local/repositories/Changes.ts
src/routes/api/v1/sync/push/+server.ts
src/routes/api/v1/sync/pull/+server.ts
src/routes/api/v1/sync/events/+server.ts
src/lib/remote/changes.remote.ts
```

Remove:

- SSE heartbeat/watchdog logic
- Manual cursor storage
- `app_meta.cursor`
- Client `change` table
- `synced` and `in_flight` processing
- Manual remote change application

The server `change` table may remain for audit/history, but it should no longer be the client synchronization mechanism unless intentionally retained for another purpose.

---

## Phase 10 — Remove obsolete dependencies

**Status: partially complete.** Migration history has been removed. Dependency and legacy sync cleanup remain.

After the new path works:

```bash
npm uninstall @tauri-apps/plugin-sql sqlocal
```

Remove imports and code for:

- `@tauri-apps/plugin-sql`
- `sqlocal`
- `drizzle-orm/sqlite-proxy`
- `createProxyTauri`
- `createProxySQLocal`
- `Database.load`
- `SQLocal`
- Custom migration runner

Keep:

- `@powersync/web`
- `@powersync/tauri-plugin`
- `@powersync/drizzle-driver`
- `drizzle-orm`
- Tauri PowerSync capability/plugin

Verify whether the installed version of `@powersync/web` requires `@journeyapps/wa-sqlite`. PowerSync dependencies should be installed/upgraded with `@latest` according to the PowerSync skill.

---

# Important discovered issues

## PowerSync synchronization is not connected yet

The local PowerSync database opens through the new lifecycle, but the web connector, Better Auth credential endpoint, upload endpoint, PowerSync service auth, and native Tauri connector are not implemented.

## Legacy sync is still active

Repository writes still call `Changes.recordChange()`, and the old REST/SSE sync path remains. `app_meta` and `change` are therefore retained temporarily as local-only tables. They should be removed only after PowerSync upload/download is verified.

## Tauri synchronization requires Rust integration

`PowerSyncTauriDatabase.connect()` is not supported from JavaScript by the installed Tauri SDK. The native connector must be implemented in `src-tauri/` using the Rust PowerSync APIs.

## Sync config still needs service validation

The local `powersync/sync-config.yaml` is now membership-scoped and includes the required tables, but it has not yet been validated/deployed against the authorized PowerSync instance.

## PowerSync does not replace the backend write API

PowerSync owns local storage and replication, but client writes still need an application backend. The existing custom push route can provide conceptual guidance, but its request format must change to PowerSync CRUD transactions.

## Better Auth is not automatically PowerSync auth

Better Auth cookies/sessions are not enough for the PowerSync service. Add a short-lived JWT credential route and configure PowerSync to validate those tokens.

## Inline PowerSync key is development-only

The public key in `powersync/service.yaml` should not be treated as a production key-management solution. Never commit a private signing key.

## Soft deletes need an explicit policy

Decide whether client `DELETE` operations:

- become `deleted_at` updates, or
- physically delete rows

If using tombstones, ensure the sync streams include them long enough for clients to receive the state and filter them in normal UI queries.

---

# Recommended implementation order

1. ~~Expand and secure `powersync/sync-config.yaml`.~~ Done locally; validation/deployment remains.
2. ~~Define the complete PowerSync schema.~~ Done.
3. ~~Define the complete Drizzle schema mapping.~~ Done.
4. [x] Add Better Auth → PowerSync credential issuance.
5. Add the PowerSync upload endpoint.
6. ~~Replace `DatabaseService` with a PowerSync database service.~~ Done locally; sync connection remains.
7. Update `AppContext` boot/auth/logout lifecycle.
8. Convert repositories to direct PowerSync writes.
9. Add Svelte reactive PowerSync query helpers.
10. [x] Implement the web connector and native Tauri connector.
11. Validate/deploy the service and test initial download sync.
12. Test offline writes, uploads, reconnect behavior, and user switching.
13. Remove old sync endpoints and SSE.
14. Remove Tauri SQL/SQLocal dependencies.
15. ~~Remove obsolete migration history.~~ Done. Remove `app_meta` and the client change-log code after the old sync path is retired.

---

# Validation checklist

## Local database

- [ ] Web opens PowerSync SQLite successfully in a runtime test.
- [ ] Tauri opens PowerSync SQLite successfully in a runtime test.
- [x] Active `DatabaseService` no longer calls `@tauri-apps/plugin-sql`.
- [x] Active `DatabaseService` no longer calls SQLocal.
- [x] No custom migration runner is needed for the PowerSync database.
- [x] Per-user database filenames are retained.
- [ ] Database data cannot leak between users in a runtime user-switch test.

## Authentication

- [x] Better Auth session exists before PowerSync connects.
- [x] PowerSync token has the correct `sub`.
- [x] PowerSync token audience matches service config.
- [x] Token expiry is short-lived.
- [x] Logout clears/disconnects local PowerSync data.
- [ ] User switching cannot expose previous user data.

## Download sync

- [x] All required domain tables are in the local PowerSync schema.
- [x] All required domain tables are represented in Sync Streams.
- [x] Stream queries use global/public or membership-scoped access as designed.
- [ ] PowerSync service sees the PostgreSQL publication in a runtime deployment.
- [ ] Initial sync completes.
- [ ] Deletes/tombstones behave correctly.

## Upload sync

- [ ] Local inserts reach the upload endpoint.
- [ ] Local patches reach PostgreSQL.
- [ ] Local deletes follow the soft-delete policy.
- [ ] Upload endpoint authorizes every operation.
- [ ] Unknown tables/columns are safely rejected.
- [ ] Transient failures return 5xx.
- [ ] Validation failures do not permanently block the queue.
- [ ] `transaction.complete()` is called after successful commits.

## Reactivity

- [ ] Remote changes update the UI without SSE.
- [ ] Local writes update the UI immediately.
- [ ] Manual `notify()` calls are no longer required for domain tables.
- [ ] Query subscriptions are disposed correctly.

---

# Recommended next coding slice

The local database slice is complete. The next reversible vertical slice is the backend/connector path:

1. Add the Better Auth → PowerSync credentials endpoint.
2. Add the authenticated PowerSync upload endpoint.
3. Implement the web connector.
4. Implement the native Tauri Rust connector.
5. Validate `space` + `resource` creation, upload, remote download, and UI refresh.
6. Only then remove repository `Changes.recordChange()` calls and the old sync layer.

This keeps authentication, uploads, native sync, and old-sync cleanup separable.

---

## Next session starting point

Start by reading:

- `POWERSYNC_MIGRATION_PLAN.md`
- `AGENTS.md`
- `.agents/skills/powersync/SKILL.md`
- `.agents/skills/powersync/AGENTS.md`
- `src/lib/server/db/schema.ts`
- `src/lib/local/db/schema.ts`
- `src/lib/local/db/index.ts`
- `powersync/sync-config.yaml`

Then inspect the current package versions and decide whether to implement the first vertical slice or first complete the schema/sync-stream design.
