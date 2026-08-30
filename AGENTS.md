# schachterl

## What this app is

**schachterl** is a local-first, offline-capable knowledge/resource management app.

- Users organize content into **spaces** (shared workspaces with members and roles: `owner` / `editor` / `viewer`).
- A space contains **resources** — a generic, tree-structured entity (`parent_id` + fractional `sort_order`) with a configurable **resource type** (`note`, and more later) that defines labels, icon and field config.
- Resources can be linked to each other via **relationships** (typed, optionally symmetric) and can reference **media**.
- Each client keeps a **local SQLite database** and syncs with a central **PostgreSQL** server through an append-only **change log** (`change` table: `create` / `update` / `delete` patches, `base_version` for conflict detection).

## Architecture

- **Frontend**: SvelteKit (next / SvelteKit 3) + Svelte 5 runes, Tailwind CSS v4, shadcn-svelte + bits-ui, `unplugin-icons` (lucide/tabler).
- **Shipping targets**:
  - Web / SPA via `@sveltejs/adapter-static` (fallback `index.html`)
  - Desktop app via **Tauri 2** (`src-tauri/`), `npm run dev:tauri` / `build:tauri`
  - Server build via `@sveltejs/adapter-node` (available, currently commented out in `vite.config.ts`)
- **Local DB**: SQLite through Drizzle + `sqlite-proxy`.
  - Browser: **SQLocal** (OPFS / WASM)
  - Tauri: `@tauri-apps/plugin-sql`
  - Custom migration runner discovers `src/lib/local/db/drizzle/migrations/*/migration.sql` via `import.meta.glob`.
- **Server DB**: PostgreSQL via Drizzle (`postgres` driver), migrations with `drizzle-kit`, local dev DB via `docker-compose.yml` (`pgdata/`, `pginit/`).
- **Auth**: **better-auth** (email/password + sessions), Postgres-backed; CORS handling for Tauri origins in `src/hooks.server.ts`.
- **Sync**:
  - Push/pull REST endpoints under `src/routes/api/v1/sync/*` plus remote functions in `src/lib/remote/changes.remote.ts`
  - Server → client "poke" notifications over SSE (`sveltekit-sse`), client side in `src/lib/local/sync/poke-client.svelte.ts` (heartbeat + watchdog + reconnect)
  - `SyncClient` (`src/lib/local/sync/index.ts`) batches changes, claims in-flight rows, tracks a cursor in `app_meta`
- **Reactivity glue**:
  - `AppContext` (`src/lib/local/app/app-context.svelte.ts`) — boot sequence, current space, focus, spaces/resource-type queries
  - `LiveQuery` (`src/lib/local/utils/live-query.svelte.ts`) — `createSubscriber`-based reactive DB query, invalidated by key via `src/lib/local/utils/invalidation.ts`
  - Scoped logger: `src/lib/logger.svelte.ts` (`log.sync`, `log.app`, `log.api`, ...)

## Directory layout

```txt
src/
  env.ts                    # defineEnvVars (public/private env schema)
  hooks.server.ts           # better-auth handler + Tauri CORS
  lib/
    components/             # see component convention below
    hooks/                  # reusable Svelte hooks (is-mobile, ...)
    local/                  # everything client/local-first
      app/                  # app context, tauri store, focus
      auth/                 # client auth state
      db/                   # sqlite schema, relations, proxy, migrations
      repositories/         # data access for local DB
      sync/                 # push/pull client, SSE poke client
      utils/                # ids, invalidation, live-query
    remote/                 # *.remote.ts SvelteKit remote functions
    server/                 # server-only (auth, pg db, poke, repositories)
    utils.ts
  routes/
    app/                    # authenticated app shell
      space/[space_id]/     # space dashboard + settings
      resource/[id]/        # resource view + settings
    auth/login|register/
    api/v1/                 # changes + sync endpoints
    settings/server/
```

Aliases: `#lib` / `#lib/*` (package imports) and `$lib` (SvelteKit). Prefer `#lib/...` with explicit `.js`/`.svelte.js` extensions, matching existing code.

## Component structure convention

Reusable components live under `src/lib/components`:

- `ui/*` → UI primitives (shadcn-svelte components and thin wrappers). No business/domain knowledge.
- `layout/*` → app shell/chrome and shared layout pieces (sidebar, page header/content).
- `features/<domain>/*` → domain/app-specific reusable components.

Examples:

- `ResourceCard` → `src/lib/components/features/resource/resource-card.svelte`
- `UserIndicator` (with popover / server status) → `src/lib/components/features/user/user-indicator.svelte`
- `AppSidebar` → `src/lib/components/layout/sidebar/app-sidebar.svelte`
- theme toggle → `src/lib/components/features/themes/app-mode-toggle.svelte`

Guidelines:

- Keep business/domain-aware components out of `ui`.
- If a component is truly one-off and route-local, keep it inline in `+page.svelte`.
- Feature-local reactive state may live next to its components (e.g. `features/tree/tree.svelte.ts`).
- Correct folder spelling: `components` (not `comonents`).
- Migration in progress: `components/elements/*` is legacy — those belong in `features/*` (e.g. `space-selector`, `resource-breadcumbs`, `user-popover`), and `layout/feed/resource-card.svelte` belongs in `features/resource/`.

## Conventions

- File names: `kebab-case.svelte`, reactive modules: `*.svelte.ts`.
- DB columns and schema identifiers: `snake_case`. Types exported next to tables (`export type Resource = typeof resource.$inferSelect`).
- Validation with `zod`; IDs are UUID v7 locally, `defaultRandom()` on Postgres.
- Soft deletes via `deleted_at`; sync versioning via `version` / `base_version`.
- Svelte 5 runes only — no legacy stores/slots (see best practices below).
- Formatting/lint: `npm run format`, `npm run lint`, type check with `npm run check`.

## Useful scripts

```sh
npm run dev              # web dev server (5173)
npm run dev:tauri        # tauri dev frontend (5174)
npm run check            # svelte-check
npm run db:gen:local     # generate local sqlite migrations
npm run db:gen:server    # generate server pg migrations
npm run db:mig:server    # apply server pg migrations
npm run db:studio:server # drizzle studio (server db)
```

---

# Svelte MCP server usage

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
