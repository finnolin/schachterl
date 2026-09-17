import { type Resource } from '#lib/local/db/schema.js';
import { Resources, compareResources } from '#lib/local/repositories/Resources.js';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { subscribeToKeys } from '#lib/local/utils/invalidation.js';
import { app_context } from '#lib/local/app/app-context.svelte.js';

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

class TreeStore {
	//rows = new SvelteMap<string, Resource>();
	rows = new SvelteMap<string, TreeRow>();
	space_id = $state<string | null>(null);
	open_nodes = new SvelteSet();
	loading = $state(false);
	#unsub: (() => void) | null = null;

	async load(space_id: string) {
		this.#unsub?.();
		this.open_nodes = new SvelteSet();
		this.space_id = space_id;
		await this.#refetch();
		this.#unsub = subscribeToKeys(['resources', `resources:space:${space_id}`], () =>
			this.#refetch()
		);
	}

	async #refetch() {
		if (!this.space_id) return;
		this.loading = true;
		const all = await new Resources().getResourcesBySpace(this.space_id, treeRowFields());
		const seen = new SvelteSet<string>();
		for (const r of all) {
			this.rows.set(r.id, r);
			seen.add(r.id);
		}
		for (const id of [...this.rows.keys()]) {
			if (!seen.has(id)) this.rows.delete(id);
		}
		this.loading = false;
	}

	clear() {
		this.#unsub?.();
		this.#unsub = null;
		this.rows.clear();
		this.space_id = null;
	}

	upsert(row: TreeRow) {
		if (this.space_id && row.space_id !== this.space_id) return;
		if (row.deleted_at) {
			this.rows.delete(row.id);
			return;
		}
		this.rows.set(row.id, row);
	}

	remove(id: string) {
		this.rows.delete(id);
	}

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
