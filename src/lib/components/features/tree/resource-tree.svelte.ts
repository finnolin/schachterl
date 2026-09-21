import { type Resource } from '#lib/local/db/schema.js';
import { Resources, compareResources } from '#lib/local/repositories/Resources.js';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { app_context } from '#lib/local/app/app-context.svelte.js';
import { LiveQuery } from '#lib/local/db/live.svelte.js';

/** Single source of truth for the resource columns the tree keeps in memory. */
const TREE_ROW_KEYS = [
	'id',
	'name',
	'sort_order',
	'parent_id',
	'space_id',
	'type',
	'deleted_at'
] as const;

export type TreeRow = Pick<Resource, (typeof TREE_ROW_KEYS)[number]>;
export type TreeNode = TreeRow & { children: TreeNode[] };

/** Build the drizzle select fields for exactly `TreeRow`, from the same key list. */
function treeRowFields() {
	const t = app_context.schema.resource;
	return Object.fromEntries(TREE_ROW_KEYS.map((k) => [k, t[k]])) as Pick<
		typeof app_context.schema.resource,
		(typeof TREE_ROW_KEYS)[number]
	>;
}

/** The (unawaited) drizzle query for one space's tree rows. */
function treeQuery(space_id: string) {
	return new Resources().getResourcesBySpaceQuery(space_id, treeRowFields());
}

class TreeStore {
	/** Follows the focused space in app_context. No manual load() needed. */
	space_id = $derived(app_context.current_space_id ?? null);

	/** Recreated (and thereby cleared) whenever the space changes. */
	open_nodes = $derived.by(() => {
		void this.space_id;
		return new SvelteSet<string>();
	});

	/** Live query for the current space. Rebuilds on space or database change. */
	#query = new LiveQuery(() => (this.space_id ? treeQuery(this.space_id) : null));

	/** All live rows of the current space, keyed by id. */
	rows = $derived.by(() => {
		const map = new SvelteMap<string, TreeRow>();
		for (const r of this.#query.data ?? []) {
			if (!r.deleted_at) map.set(r.id, r);
		}
		return map;
	});

	loading = $derived(this.#query.loading);

	error = $derived(this.#query.error);

	wouldCreateCycle(moving_id: string, target_parent_id: string): boolean {
		let current: string | null = target_parent_id;
		const seen = new SvelteSet<string>();
		while (current) {
			if (current === moving_id) return true;
			if (seen.has(current)) return false;
			seen.add(current);
			current = this.rows.get(current)?.parent_id ?? null;
		}
		return false;
	}

	ancestorsOf(id: string): TreeRow[] {
		const path: TreeRow[] = [];
		let current = this.rows.get(id)?.parent_id ?? null;
		const seen = new SvelteSet<string>();
		while (current && !seen.has(current)) {
			seen.add(current);
			const row = this.rows.get(current);
			if (!row) break;
			path.unshift(row);
			current = row.parent_id;
		}
		return path;
	}

	openNode(id: string) {
		this.open_nodes.add(id);
	}
	closeNode(id: string) {
		this.open_nodes.delete(id);
	}
	toggleNode(id: string) {
		if (this.open_nodes.has(id)) {
			this.closeNode(id);
		} else {
			this.openNode(id);
		}
	}
}

export const tree = new TreeStore();

/** Flat rows -> nested tree. O(n). */
export function buildNested(rows: TreeRow[]): TreeNode[] {
	const by_id = new SvelteMap<string, TreeNode>();
	for (const r of rows) {
		if (r.deleted_at) continue;
		by_id.set(r.id, { ...r, children: [] });
	}

	const roots: TreeNode[] = [];
	for (const node of by_id.values()) {
		const parent_id = node.parent_id ?? null;
		const parent = parent_id ? by_id.get(parent_id) : null;
		if (parent) parent.children.push(node);
		else roots.push(node);
	}

	const sortRec = (nodes: TreeNode[]) => {
		nodes.sort(compareResources);
		for (const n of nodes) sortRec(n.children);
	};
	sortRec(roots);

	return roots;
}
