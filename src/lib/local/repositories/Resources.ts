import { Changes } from './Changes';
import { type ResourceInsert } from '../db/schema';
import { app_context as app } from '../app/app-context.svelte';
import { eq } from 'drizzle-orm';

import { generateKeyBetween, generateJitteredKeyBetween } from 'fractional-indexing-jittered';
import { tree } from '$lib/local/utils/tree.svelte';
import { notify } from '../utils/invalidation';

export class Resources {
	private schema = app.schema;

	async createResource(values: Omit<ResourceInsert, 'sort_order'>) {
		const db = app.db;
		const siblings = this.siblingsOf(values.parent_id ?? null);
		const last = siblings.at(-1)?.sort_order ?? null;
		const insert = {
			...values,
			sort_order: generateJitteredKeyBetween(last, null)
		};
		const [row] = await db.insert(this.schema.resource).values(insert).returning();
		await new Changes().recordChange({
			entity_id: row.id,
			entity_type: 'resource',
			op: 'create',
			patch: row
		});
		notify('resources', `resources:space:${values.space_id}`);
		return row;
	}

	async updateResource(id: string, space_id: string, values: Partial<ResourceInsert>) {
		const db = app.db;
		await db.update(this.schema.resource).set(values).where(eq(this.schema.resource.id, id));
		await new Changes().recordChange({
			entity_id: id,
			entity_type: 'resource',
			op: 'update',
			patch: values
		});
		notify('resources', `resources:space:${space_id}`);
	}

	async deleteResource(id: string, space_id: string) {
		const db = app.db;
		await db.delete(this.schema.resource).where(eq(this.schema.resource.id, id));
		await new Changes().recordChange({
			entity_id: id,
			entity_type: 'resource',
			op: 'delete',
			patch: {}
		});
		notify('resources', `resources:space:${space_id}`);
	}

	async getResourcesBySpace(space_id: string) {
		const db = app.db;
		return db
			.select()
			.from(this.schema.resource)
			.where(eq(this.schema.resource.space_id, space_id));
	}

	async moveUp(id: string, parent_id: string | null, space_id: string) {
		const full = this.siblingsOf(parent_id);
		const pos = full.findIndex((r) => r.id === id);
		if (pos <= 0) return;
		await this.moveTo(id, parent_id, pos - 1, space_id);
	}

	async moveDown(id: string, parent_id: string | null, space_id: string) {
		const full = this.siblingsOf(parent_id);
		const pos = full.findIndex((r) => r.id === id);
		if (pos === -1 || pos >= full.length - 1) return;
		await this.moveTo(id, parent_id, pos + 1, space_id);
	}

	/**
	 * Move `id` into `parent_id` at `index` (0-based, display order,
	 * counting siblings other than `id`). index 0 = first, index = count = last.
	 */
	async moveTo(id: string, parent_id: string | null, index: number, space_id: string) {
		if (parent_id && tree.wouldCreateCycle(id, parent_id)) {
			throw new Error('Cannot move a resource into its own descendant');
		}
		const siblings = this.siblingsOf(parent_id).filter((r) => r.id !== id);
		const clamped = Math.max(0, Math.min(index, siblings.length));
		const before = siblings[clamped - 1]?.sort_order ?? null;
		const after = siblings[clamped]?.sort_order ?? null;
		const sort_order = generateKeyBetween(before, after);
		await this.updateResource(id, space_id, { parent_id, sort_order });
	}

	/**
	 * Drop `id` between two known sibling nodes (for drag-and-drop).
	 * `before_id` / `after_id` may be null for start / end.
	 * Both must belong to `parent_id` and be adjacent in display order.
	 */
	async moveBetween(
		id: string,
		parent_id: string | null,
		before_id: string | null,
		after_id: string | null,
		space_id: string
	) {
		if (parent_id && tree.wouldCreateCycle(id, parent_id)) {
			throw new Error('Cannot move a resource into its own descendant');
		}
		const before = before_id ? (tree.rows.get(before_id)?.sort_order ?? null) : null;
		const after = after_id ? (tree.rows.get(after_id)?.sort_order ?? null) : null;
		const sort_order = generateKeyBetween(before, after);
		await this.updateResource(id, space_id, { parent_id, sort_order });
	}

	private siblingsOf(parent_id: string | null) {
		return [...tree.rows.values()]
			.filter((r) => (r.parent_id ?? null) === parent_id && !r.deleted_at)
			.sort(compareResources);
	}
}

/** Shared ordering: sort_order, then id as a stable tiebreaker. */
export function compareResources(
	a: { sort_order: string; id: string },
	b: { sort_order: string; id: string }
) {
	if (a.sort_order !== b.sort_order) return a.sort_order < b.sort_order ? -1 : 1;
	return a.id < b.id ? -1 : 1;
}
