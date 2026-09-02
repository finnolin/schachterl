import type { ResourceFieldConfig } from '#lib/local/db/schema.js';

export const baseFields = [
	{ field: 'content', label: 'Content', description: 'Long-form text body' },
	{ field: 'url', label: 'URL', description: 'Link to an external resource' }
] as const;

export function fieldLabel(field: string) {
	return baseFields.find((b) => b.field === field)?.label ?? field;
}

export function normalizeFieldConfig(config?: ResourceFieldConfig[] | null) {
	return (config ?? []).map((f) => (f.label?.trim() ? { field: f.field, label: f.label.trim() } : { field: f.field }));
}
