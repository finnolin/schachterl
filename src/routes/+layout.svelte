<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { app_context } from '#lib/local/app/app-context.svelte.js';
	import UserIndicator from '#lib/components/elements/user-popover/user-indicator.svelte';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();

	onMount(async () => {
		try {
			await app_context.initialize();
		} catch (error) {
			console.error('Failed to initialize app:', error);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<UserIndicator />
<ModeWatcher />
{@render children?.()}
