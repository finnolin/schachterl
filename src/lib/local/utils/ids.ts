export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
export const SYSTEM_CLIENT_ID = '00000000-0000-0000-0000-000000000001';
export const NOTE_TYPE_ID = '00000000-0000-0000-0000-000000000002';

export const BUILTIN_RESOURCE_TYPES = [
	{
		id: NOTE_TYPE_ID,
		key: 'note',
		singular: 'Note',
		plural: 'Notes',
		icon: 'sticky-note',
		field_config: [{ field: 'content' }]
	}
] as const;
