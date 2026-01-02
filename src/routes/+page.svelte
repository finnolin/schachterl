<script lang="ts">
	import { db } from '$lib/repositories/adapter';
	let test = $derived(db.test());
</script>

<svelte:boundary>
	{await test}
	{#snippet failed()}
		Failed
	{/snippet}
	{#snippet pending()}
		Loading
	{/snippet}
</svelte:boundary>
<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
