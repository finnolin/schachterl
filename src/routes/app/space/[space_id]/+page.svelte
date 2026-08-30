<script lang="ts">
	import ResourceCard from '#lib/components/layout/feed/resource-card.svelte';
	import SettingsIcon from '~icons/lucide/settings';
	import Button from '#lib/components/ui/button/button.svelte';

	import { useSpace } from '#lib/local/app/focus.js';

	const space = $derived(await useSpace()());
</script>

<div class="flex flex-row gap-2">
	{space?.name}<Button variant="ghost" size="icon-sm"><SettingsIcon class="size-4" /></Button>
</div>

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
