import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

export function coerce(patch: Record<string, unknown> | null): Record<string, unknown> {
	if (!patch) return {};
	const out = { ...patch };
	for (const field of ['created_at', 'updated_at', 'deleted_at']) {
		if (typeof out[field] === 'string') out[field] = new Date(out[field] as string);
	}
	return out;
}

export function generateRandomNoteTitle() {
	const adjectives = [
		'Meeting',
		'Project',
		'Quick',
		'Daily',
		'Weekly',
		'Important',
		'Personal',
		'Work',
		'Research',
		'Travel',
		'Recipe',
		'Ideas',
		'Shopping',
		'Random',
		'Draft',
		'Final',
		'Urgent',
		'Study',
		'Morning',
		'Evening'
	];

	const subjects = [
		'Notes',
		'Plan',
		'Checklist',
		'Thoughts',
		'Journal',
		'Tasks',
		'Summary',
		'Brainstorm',
		'Outline',
		'Goals',
		'Todo',
		'Review',
		'Budget',
		'Schedule',
		'Report',
		'Memo',
		'Ideas',
		'Reference',
		'Log',
		'Collection'
	];

	const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
	const subject = subjects[Math.floor(Math.random() * subjects.length)];

	// ~30% chance of appending a number
	if (Math.random() < 0.3) {
		return `${adjective} ${subject} ${Math.floor(Math.random() * 100) + 1}`;
	}

	return `${adjective} ${subject}`;
}
