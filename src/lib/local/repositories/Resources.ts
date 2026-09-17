import { Changes } from './Changes';
import { type ResourceInsert, type Resource } from '../db/schema';
import { app_context as app } from '../app/app-context.svelte';
import { eq, and, isNull, asc, desc, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { SelectedFields } from 'drizzle-orm/sqlite-core/query-builders/select.types';

import { generateKeyBetween, generateJitteredKeyBetween } from 'fractional-indexing-jittered';
import { tree } from '#lib/components/features/tree/tree.svelte.js';
import { notify } from '../utils/invalidation';

type ResourceFilter = Partial<Pick<Resource, 'parent_id' | 'space_id'>>;

type ResourceSortField = 'updated_at' | 'sort_order';

type ResourceQueryOptions = {
	filter?: ResourceFilter;
	sort?: { by: ResourceSortField; dir?: 'asc' | 'desc' };
	limit?: number;
	offset?: number;
};

type ResourceSelectFields = SelectedFields;

export class Resources {
	private schema = app.schema;

	private getDefaultResourceBySpaceFields() {
		const t = this.schema.resource;
		return {
			id: t.id,
			space_id: t.space_id,
			parent_id: t.parent_id,
			sort_order: t.sort_order,
			name: t.name,
			type: t.type,
			content: t.content,
			url: t.url,
			image: t.image,
			created_at: t.created_at,
			updated_at: t.updated_at,
			deleted_at: t.deleted_at
			//version: t.version
		} satisfies ResourceSelectFields;
	}

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
		notify('resources', `resource.space_id:${values.space_id}`);
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
		notify('resource', `resource.space_id:${space_id}`);
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
		//notify('resource', `resource.space_id:${space_id}`);
	}

	async getResourcesBySpace<
		TFields extends ResourceSelectFields = ReturnType<Resources['getDefaultResourceBySpaceFields']>
	>(space_id: string, fields?: TFields) {
		const t = this.schema.resource;
		const db = app.db;
		const selected_fields =
			fields ?? (this.getDefaultResourceBySpaceFields() as unknown as TFields);
		return db.select(selected_fields).from(t).where(eq(t.space_id, space_id));
	}

	async getChildResources(parent_id: string = '') {
		const db = app.db;
		const table = this.schema.resource;
		return db.select().from(table).where(eq(table.parent_id, parent_id));
	}

	async getResourceById(resource_id: string) {
		const t = app.schema.resource;
		const [resource] = await app.db.select().from(t).where(eq(t.id, resource_id));
		return resource;
	}

	async getResources(options: ResourceQueryOptions = {}) {
		const table = app.schema.resource;

		const conditions: SQL[] = [isNull(table.deleted_at)];

		for (const [key, value] of Object.entries(options.filter ?? {})) {
			if (value === undefined) continue;
			const col = table[key as keyof ResourceFilter] as SQLiteColumn;
			conditions.push(value === null ? isNull(col) : eq(col, value));
		}

		let query = app.db
			.select()
			.from(table)
			.where(and(...conditions))
			.$dynamic();

		if (options.sort) {
			const col = table[options.sort.by];
			query = query.orderBy(options.sort.dir === 'desc' ? desc(col) : asc(col));
		}

		if (options.limit !== undefined) query = query.limit(options.limit);
		if (options.offset !== undefined) query = query.offset(options.offset);

		return await query;
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
