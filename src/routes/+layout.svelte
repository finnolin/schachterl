<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { app_context } from '#lib/local/app/app-context.svelte.js';
	import { store } from '#lib/local/app/store.svelte.js';
	import { sidebar } from '#lib/components/layout/sidebar/sidebar_state.svelte.js';
	import PageHeader from '#lib/components/ui/page/page-header.svelte';
	import UserIndicator from '#lib/components/elements/user-popover/user-indicator.svelte';
	//Components:
	// import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	// import AppSidebar from '#lib/components/app-sidebar.svelte';
	import AppSidebar from '#lib/components/layout/sidebar/app-sidebar.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import SidebarWrapper from '#lib/components/layout/sidebar/sidebar-wrapper.svelte';
	import SidebarMain from '#lib/components/layout/sidebar/sidebar-main.svelte';
	//import SidebarToggle from '#lib/components/layout/sidebar/sidebar-toggle.svelte';
	import PageContent from '#lib/components/ui/page/page-content.svelte';
	import Spinner from '#lib/components/ui/spinner/spinner.svelte';

	let { children } = $props();
	let is_ready = $state(false);
	// $effect(() => {
	// 	if ($session?.data) {
	// 		log.info($session.data.session);
	// 	}
	// });
	onMount(async () => {
		try {
			// 1. Initialize store for tauri
			await store.initialize();
			await app_context.initialize();
			await sidebar.initialize();
			is_ready = true;
		} catch (error) {
			console.error('Failed to initialize database:', error);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<UserIndicator />
<ModeWatcher />
{#if app_context.drizzle_db}
	{#if is_ready}
		<SidebarWrapper frame={false}>
			{#snippet sidebar_content()}
				<AppSidebar />
			{/snippet}

			<SidebarMain>
				<PageHeader />
				<PageContent>
					<svelte:boundary>
						{@render children?.()}
						{#snippet pending()}
							<div class="w-40 h-40 bg-red-600">Loading...</div>
						{/snippet}
					</svelte:boundary>
				</PageContent>
			</SidebarMain>
		</SidebarWrapper>
	{/if}
{:else}
	<div class="flex h-screen w-full flex-col items-center justify-center">
		<Spinner class="size-7" />
	</div>
{/if}
