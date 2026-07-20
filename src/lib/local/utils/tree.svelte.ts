import { type Resource } from '$lib/local/db/schema';
import { Resources, compareResources } from '$lib/local/repositories/Resources';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { subscribeToKeys } from './invalidation';

export type TreeNode = Resource & { children: TreeNode[] };

class TreeStore {
	rows = new SvelteMap<string, Resource>();
	space_id = $state<string | null>(null);
	loading = $state(false);
	#unsub: (() => void) | null = null;

	async load(space_id: string) {
		this.#unsub?.();
		this.space_id = space_id;
		await this.#refetch();
		this.#unsub = subscribeToKeys(['resources', `resources:space:${space_id}`], () =>
			this.#refetch()
		);
	}

	async #refetch() {
		if (!this.space_id) return;
		this.loading = true;
		const all = await new Resources().getResourcesBySpace(this.space_id);
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

	upsert(row: Resource) {
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

	ancestorsOf(id: string): Resource[] {
		const path: Resource[] = [];
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
}

export const tree = new TreeStore();

/** Flat rows -> nested tree. O(n). */
export function buildNested(rows: Resource[]): TreeNode[] {
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
