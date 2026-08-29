<script lang="ts">
	import { page } from '$app/state';
	import { app_context } from '#lib/local/app/app-context.svelte.js';

	let current_id: string | undefined;

	$effect(() => {
		const id = page.params.id;
		if (!id || id === current_id) return; // same space → skip
		current_id = id;

		let cancelled = false;
		(async () => {
			await app_context.setFocus({ id, type: 'resource' });
			if (cancelled) return;
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

{app_context.focused_item?.name}
