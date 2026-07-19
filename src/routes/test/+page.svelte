<script lang="ts">
	import { goto } from '$app/navigation';
	import { app_context } from '$lib/local/app/app-context.svelte';
	import { local_db } from '$lib/local/db';
	import { Users } from '$lib/local/repositories/user';
	import { sync_client } from '$lib/local/sync';
	import { Resources } from '$lib/local/repositories/Resources';
	console.log('test: +page.svelte');

	let refresh = $state(0);
	const db = app_context.db;
	const schema = local_db.schema;

	async function addResource() {
		await new Resources().createResource({ type: 'note' });

		refresh++; // trigger reload
	}

	async function getUsers() {
		refresh; // <-- dependency (just read it)
		const query = await db.select().from(schema.user);
		return query;
	}
	async function push() {
		const changes = await sync_client.push();
	}
	async function pull() {
		// const changes = await new Changes().pullChanges();
		// console.log(changes);
	}

	let user_list = $derived(getUsers());
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<button onclick={addResource}>Add Resource</button>
<button onclick={getUsers}>getUsers</button>
<button onclick={push}>Push</button>
<button onclick={pull}>Pull</button>
<svelte:boundary>
	{#each await user_list as user (user.id)}
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
<svelte:boundary>
	{#snippet failed()}
		Failed
	{/snippet}
	{#snippet pending()}
		Loading
	{/snippet}
</svelte:boundary>
