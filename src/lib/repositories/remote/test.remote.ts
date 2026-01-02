import { query } from '$app/server';
import type { RemoteQueryFunction } from '@sveltejs/kit';

export const getTest = query(async () => {
	return ['test'];
});
