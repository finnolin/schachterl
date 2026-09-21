<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { LiveQuery } from '#lib/local/db/live.svelte.js';
	import { Users } from '#lib/local/repositories/user.js';

	const users_query = new LiveQuery(() => new Users().getUsers());
	const users = $derived(users_query.data ?? []);
	const loading = $derived(users_query.loading);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Users</Card.Title>
		<Card.Description>All users currently present in the local database.</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if loading}
			<p class="text-muted-foreground text-sm">Loading users...</p>
		{:else if users.length === 0}
			<p class="text-muted-foreground text-sm">No users found.</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each users as user (user.id)}
					<div class="rounded-md border p-3">
						<div class="font-medium">{user.name}</div>
						<div class="text-muted-foreground text-xs">{user.id}</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
