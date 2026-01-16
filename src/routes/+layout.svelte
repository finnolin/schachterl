<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { local_db } from '$lib/local/db';
	import { app_context } from '$lib/local/app/app-context.svelte';
	import { initializeAuthClient, useSession, getAuthClient } from '$lib/local/auth';
	import log from '$lib/logger.svelte';

	let { children } = $props();
	let is_ready = $state(false);
	let session = $state<ReturnType<typeof useSession>>();
	$effect(() => {
		if ($session?.data) {
			log.info($session.data.session);
		}
	});
	onMount(async () => {
		try {
			await local_db.initialize();
			await app_context.initialize();
			initializeAuthClient();
			session = useSession();
			const auth_client = getAuthClient();
			const token = localStorage.getItem('bearer_token');
			// if (token) {
			// 	const tauri_session = await auth_client.getSession({
			// 		fetchOptions: {
			// 			headers: {
			// 				Authorization: `Bearer ${token}`
			// 			}
			// 		}
			// 	});
			// 	log.debug('tauri_session', tauri_session);
			// }
			//console.log($session?.data);

			is_ready = true;
		} catch (error) {
			console.error('Failed to initialize database:', error);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex w-full h-10 p-2 gap-2">
	{#if $session?.data}
		have session: {$session.data.user?.email}
	{:else}
		no session
	{/if}
	<a href="/">Home</a>
	<a href="/login">Login</a>
</div>

{#if is_ready}
	{@render children()}
{:else}
	<div>Setting up database...</div>
{/if}
