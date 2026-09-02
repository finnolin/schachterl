import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
	// TODO: add app-wide admin role checks once auth/roles are modeled.
	return {};
};
