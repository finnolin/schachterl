<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { defineCustomElements } from 'jeep-sqlite/loader';
	import { databaseService } from '$lib/local/db';
	defineCustomElements();
	let { children } = $props();
	let isReady = $state(false);

	onMount(async () => {
		try {
			await databaseService.initialize();
			isReady = true;
		} catch (error) {
			console.error('Failed to initialize database:', error);
		}
	});
</script>

<!-- jeep-sqlite is a Web Component that acts as a bridge between JavaScript and native SQLite, and Web Components only exist when they’re attached to the DOM. -->
<jeep-sqlite autoSave="true"></jeep-sqlite>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if isReady}
	{@render children()}
{:else}
	<div>Setting up database...</div>
{/if}
