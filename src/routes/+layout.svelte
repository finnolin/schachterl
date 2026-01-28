<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { local_db } from '$lib/local/db';
	import { app_context } from '$lib/local/app/app-context.svelte';
	import { sidebar } from '$lib/components/layout/sidebar/sidebar_state.svelte';
	import { initializeAuthClient, useSession, getAuthClient } from '$lib/local/auth';
	import log from '$lib/logger.svelte';

	//Components:
	// import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	// import AppSidebar from '$lib/components/app-sidebar.svelte';
	import AppSidebar from '$lib/components/layout/sidebar/app-sidebar.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import SidebarWrapper from '$lib/components/layout/sidebar/sidebar-wrapper.svelte';
	import SidebarMain from '$lib/components/layout/sidebar/sidebar-main.svelte';

	let { children } = $props();
	let is_ready = $state(false);
	let session = $state<ReturnType<typeof useSession>>();
	// $effect(() => {
	// 	if ($session?.data) {
	// 		log.info($session.data.session);
	// 	}
	// });
	onMount(async () => {
		try {
			await app_context.initialize();
			await sidebar.initialize();
			//await local_db.initialize();
			//session = useSession();
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

	async function logout() {
		await app_context.logout();
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />
<!-- <Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<main>
			<Sidebar.Trigger />
			<div class="flex w-full h-10 p-2 gap-2" data-sveltekit-preload-data="false">
				<a href="/">Home</a>
				<a href="/test">Test</a>
				{#if app_context.session}
					<button onclick={logout}>Logout</button>
				{:else}
					<a href="/login">Login</a>
				{/if}
			</div>

			{#if is_ready}
				{@render children?.()}
			{:else}
				<div>Setting up database...</div>
			{/if}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider> -->
{#if is_ready}
	<SidebarWrapper frame={false}>
		{#snippet sidebar_content()}
			<AppSidebar />
		{/snippet}

		<SidebarMain>
			{@render children?.()}
		</SidebarMain>
	</SidebarWrapper>
{/if}
