import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema, type ServerTx } from '#lib/server/db/index.js';

const table_names = [
	'user',
	'space',
	'space_user',
	'space_resource_type',
	'resource_type',
	'resource',
	'media',
	'relationship_type',
	'relationship'
] as const;

type TableName = (typeof table_names)[number];
type UploadOperation = z.infer<typeof upload_operation_schema>;
type Row = Record<string, unknown>;

const upload_operation_schema = z.object({
	op: z.enum(['PUT', 'PATCH', 'DELETE']),
	table: z.enum(table_names),
	id: z.string().min(1),
	data: z.record(z.string(), z.unknown()).optional()
});

const upload_request_schema = z.object({
	batch: z.array(upload_operation_schema).min(1).max(1000)
});

const tables = {
	user: schema.user,
	space: schema.space,
	space_user: schema.space_user,
	space_resource_type: schema.space_resource_type,
	resource_type: schema.resource_type,
	resource: schema.resource,
	media: schema.media,
	relationship_type: schema.relationship_type,
	relationship: schema.relationship
} as const;

// PowerSync sends row data without the id, which is sent separately as op.id.
// Keeping this allowlist here prevents clients from writing arbitrary columns.
const timestamp_columns = new Set(['created_at', 'updated_at', 'deleted_at']);

const writable_columns: Record<TableName, readonly string[]> = {
	user: [],
	space: ['name', 'icon', 'default_resource_type', 'created_by', 'created_at', 'updated_at'],
	space_user: ['space_id', 'user_id', 'role', 'created_at', 'updated_at'],
	space_resource_type: ['space_id', 'resource_type_id', 'created_at', 'updated_at'],
	resource_type: [
		'key',
		'singular',
		'plural',
		'icon',
		'description',
		'field_config',
		'created_at',
		'updated_at'
	],
	resource: [
		'space_id',
		'parent_id',
		'sort_order',
		'name',
		'type',
		'content',
		'url',
		'image',
		'created_at',
		'updated_at',
		'deleted_at',
		'version'
	],
	media: [
		'space_id',
		'file_path',
		'file_name',
		'mime_type',
		'created_at',
		'updated_at',
		'deleted_at'
	],
	relationship_type: [
		'key',
		'forward_label',
		'reverse_label',
		'symmetric',
		'from_type',
		'to_type',
		'created_at',
		'updated_at'
	],
	relationship: [
		'space_id',
		'relationship_type',
		'from_resource',
		'to_resource',
		'created_at',
		'updated_at'
	]
};

class UploadValidationError extends Error {}

function getRowData(operation: UploadOperation): Row {
	const data = operation.data ?? {};
	const allowed = new Set(writable_columns[operation.table]);
	const unknown_columns = Object.keys(data).filter((column) => !allowed.has(column));

	if (unknown_columns.length > 0) {
		throw new UploadValidationError(
			`Unknown column(s) for ${operation.table}: ${unknown_columns.join(', ')}`
		);
	}

	for (const column of timestamp_columns) {
		const value = data[column];
		if (value === undefined || value === null || value instanceof Date) continue;
		if (typeof value !== 'string') {
			throw new UploadValidationError(`Invalid timestamp value for ${operation.table}.${column}`);
		}

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			throw new UploadValidationError(`Invalid timestamp value for ${operation.table}.${column}`);
		}
		data[column] = date;
	}

	return data;
}

async function getExistingRow(
	tx: ServerTx,
	table_name: TableName,
	id: string
): Promise<Row | undefined> {
	const table = tables[table_name] as any;
	const [row] = await tx.select().from(table).where(eq(table.id, id)).limit(1);
	return row as Row | undefined;
}

function getSpaceId(table_name: TableName, id: string, data: Row, existing?: Row) {
	if (table_name === 'space') return id;
	if (typeof data.space_id === 'string') return data.space_id;
	if (typeof existing?.space_id === 'string') return existing.space_id;
	return null;
}

async function getRole(tx: ServerTx, user_id: string, space_id: string) {
	const [membership] = await tx
		.select({ role: schema.space_user.role })
		.from(schema.space_user)
		.where(and(eq(schema.space_user.user_id, user_id), eq(schema.space_user.space_id, space_id)))
		.limit(1);

	if (membership) return membership.role;

	const [space] = await tx
		.select({ created_by: schema.space.created_by })
		.from(schema.space)
		.where(eq(schema.space.id, space_id))
		.limit(1);

	return space?.created_by === user_id ? 'owner' : null;
}

async function authorize(
	tx: ServerTx,
	operation: UploadOperation,
	user_id: string,
	user_role: string,
	data: Row,
	existing?: Row
) {
	if (operation.table === 'user') {
		throw new UploadValidationError('User rows are not writable through PowerSync uploads');
	}

	if (operation.table === 'resource_type' || operation.table === 'relationship_type') {
		if (user_role !== 'admin') {
			throw new UploadValidationError(`Only admins can write ${operation.table} rows`);
		}
		return;
	}

	// A new space has no membership row yet. The creator is assigned as the
	// owner below, and the following batch operation can then create the
	// initial space_user row.
	if (operation.table === 'space' && operation.op === 'PUT' && !existing) return;

	const space_id = getSpaceId(operation.table, operation.id, data, existing);
	if (!space_id) {
		if (operation.table === 'space' && operation.op === 'PUT' && !existing) return;
		throw new UploadValidationError(
			`Could not determine the space for ${operation.table}:${operation.id}`
		);
	}

	const role = await getRole(tx, user_id, space_id);
	if (!role) throw new UploadValidationError('User is not a member of the target space');

	if (operation.table === 'space_user' || operation.table === 'space_resource_type') {
		if (role !== 'owner') {
			throw new UploadValidationError(`Only space owners can modify ${operation.table} rows`);
		}
		return;
	}

	if (role === 'viewer') {
		throw new UploadValidationError('Viewers cannot write to the target space');
	}
}

async function applyOperation(
	tx: ServerTx,
	operation: UploadOperation,
	user_id: string,
	user_role: string
) {
	const table = tables[operation.table] as any;
	const data = getRowData(operation);
	const existing = await getExistingRow(tx, operation.table, operation.id);

	if (operation.op === 'PATCH' && !existing) {
		throw new UploadValidationError(`Cannot patch missing ${operation.table} row ${operation.id}`);
	}

	await authorize(tx, operation, user_id, user_role, data, existing);

	if (operation.table === 'space') {
		// Never trust the client-provided creator, including on updates.
		if (operation.op === 'PUT' && !existing) {
			data.created_by = user_id;
		} else {
			delete data.created_by;
		}
	}

	if (operation.op === 'DELETE') {
		if (operation.table === 'resource' || operation.table === 'media') {
			await tx
				.update(table)
				.set({ deleted_at: new Date(), updated_at: new Date() })
				.where(eq(table.id, operation.id));
		} else {
			await tx.delete(table).where(eq(table.id, operation.id));
		}
		return;
	}

	if (operation.op === 'PUT') {
		await tx
			.insert(table)
			.values({ id: operation.id, ...data })
			.onConflictDoUpdate({ target: table.id, set: data });
		return;
	}

	await tx.update(table).set(data).where(eq(table.id, operation.id));
}

export async function POST({ request, locals }) {
	console.log('post');
	if (!locals.session || !locals.user) {
		return Response.json({ error: 'Not authenticated' }, { status: 401 });
	}

	const user_id = locals.session.userId;
	const user_role = locals.user.role;

	let parsed: z.infer<typeof upload_request_schema>;
	try {
		parsed = upload_request_schema.parse(await request.json());
	} catch (error) {
		return Response.json(
			{ error: 'Invalid PowerSync upload request', details: error },
			{ status: 400 }
		);
	}

	const accepted: string[] = [];
	const rejected: Array<{
		id: string;
		table: TableName;
		op: UploadOperation['op'];
		reason: string;
	}> = [];

	for (const operation of parsed.batch) {
		try {
			await db.transaction(async (tx) => {
				await applyOperation(tx, operation, user_id, user_role);
			});
			accepted.push(operation.id);
		} catch (error) {
			if (error instanceof UploadValidationError) {
				// This operation is permanently rejected. Return 2xx so PowerSync
				// can complete the transaction instead of retrying it forever.
				rejected.push({
					id: operation.id,
					table: operation.table,
					op: operation.op,
					reason: error.message
				});
				continue;
			}

			console.error('PowerSync upload failed', error);
			return Response.json({ error: 'PowerSync upload failed' }, { status: 500 });
		}
	}

	return Response.json({ ok: true, accepted, rejected });
}
