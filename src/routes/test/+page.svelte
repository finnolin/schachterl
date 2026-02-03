<script lang="ts">
	import { goto } from '$app/navigation';
	import { app_context } from '$lib/local/app/app-context.svelte';
	import { local_db } from '$lib/local/db';
	console.log('test: +page.svelte');

	let refresh = $state(0);
	const db = local_db.db;
	const schema = local_db.schema;
	if (!db) {
		goto('/login');
	}
	async function addUser() {
		const user = await db!.insert(schema.user).values({ name: 'test' }).returning();
		console.log(user);

		refresh++; // trigger reload
	}

	async function getUsers() {
		refresh; // <-- dependency (just read it)
		const query = await db!.select().from(schema.user);
		return query;
	}

	let user_list = $derived(getUsers());
</script>

<!-- <svelte:boundary>
	{await test}
	{#snippet failed()}
		Failed
	{/snippet}
	{#snippet pending()}
		Loading
	{/snippet}
</svelte:boundary> -->

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<button onclick={addUser}>AddUser</button>
<button onclick={getUsers}>getUsers</button>
<svelte:boundary>
	{#each await user_list as user}
		<div>
			{user.id}
		</div>
	{/each}
	{#snippet failed()}
		Failed
	{/snippet}
	{#snippet pending()}
		Loading
	{/snippet}
</svelte:boundary>
