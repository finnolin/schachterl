<!-- /space/[id]/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/state';
	import { setContext } from 'svelte';
	import { Spaces } from '$lib/local/repositories/Spaces';
	import { app_context } from '$lib/local/app/app-context.svelte';

	let { children } = $props();

	// no await here — this is just a Promise, recreated when params.id changes
	// const spacePromise = $derived(new Spaces().getSpaceById(page.params.id!));
	// setContext('space', () => spacePromise);

	// const space = $derived(await new Spaces().getSpaceById(page.params.space_id!));
	// $effect(() => {
	// 	if (space) {
	// 		app_context.setSpaceById(space.id);
	// 	}
	// });

	const spacePromise = $derived(new Spaces().getSpaceById(page.params.space_id!));
	setContext('space', () => spacePromise);

	$effect(() => {
		app_context.setSpaceById(page.params.space_id!); // fire-and-forget, re-runs when id changes
	});
</script>

<!-- <svelte:boundary> -->
{@render children()}
<!-- {#snippet pending()}
		<div class="w-40 h-40 bg-red-600">Loading...</div>
	{/snippet}
</svelte:boundary> -->
