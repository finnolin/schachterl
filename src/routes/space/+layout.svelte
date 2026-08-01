<script lang="ts">
	import { page } from '$app/state';
	import { app_context as app } from '$lib/local/app/app-context.svelte';
	let { children } = $props();

	// let last: string | undefined;
	// $effect(() => {
	// 	const id = page.params.id;
	// 	if (id && id !== last) {
	// 		last = id;
	// 		app.clearFocus();
	// 		app.setFocus({ id, type: 'space' });
	// 	}
	// });

	$effect(() => {
		const id = page.params.id;
		if (id) app.setFocus({ id, type: 'space' });
	});
</script>

{@render children()}
