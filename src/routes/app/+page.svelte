<script lang="ts">
	import { resolve } from '$app/paths';
	import SpaceCard from '#lib/components/features/space/space-card.svelte';
	import { LiveQuery } from '#lib/local/db/live.svelte.js';
	import { Spaces } from '#lib/local/repositories/Spaces.js';

	const spaces_query = new LiveQuery(() => new Spaces().getSpaces());
	const spaces = $derived(spaces_query.data ?? []);
	const loading = $derived(spaces_query?.loading ?? true);
</script>

<section class="space-y-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Spaces</h1>
		<p class="text-muted-foreground text-sm">Choose a space to open its dashboard.</p>
	</header>

	{#if loading}
		<p class="text-muted-foreground text-sm">Loading spaces...</p>
	{:else if spaces.length === 0}
		<p class="text-muted-foreground text-sm">No spaces available yet.</p>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each spaces as space (space.id)}
				<SpaceCard
					name={space.name}
					updatedAt={space.updated_at}
					href={resolve('/app/space/[space_id]', { space_id: space.id })} />
			{/each}
		</div>
	{/if}
</section>
