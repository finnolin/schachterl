<script lang="ts">
	import { app_context } from '#lib/local/app/app-context.svelte.js';
	import ResourceCard from '#lib/components/layout/feed/resource-card.svelte';
	import { useSpace } from '#lib/local/app/focus.js';

	const space = $derived(await useSpace()());
</script>

{space?.name}
<svelte:boundary>
	{#if space}
		<div>
			<div class="flex flex-row items-center w-full">
				<h3 class="scroll-m-20 text-2xl font-semibold tracking-tight px-2 py-4">Recent</h3>
				<!-- <h3 class="scroll-m-20 text-2xl tracking-tight">/ Pinned / Recent</h3> -->
			</div>
			<ResourceCard {space} />
		</div>
	{/if}
	{#snippet pending()}
		<div class="w-20 h-40 bg-amber-600">Loading</div>
	{/snippet}
</svelte:boundary>
