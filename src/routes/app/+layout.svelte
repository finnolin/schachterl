<script lang="ts">
	import PageHeader from '#lib/components/layout/page/page-header.svelte';
	import UserIndicator from '#lib/components/elements/user-popover/user-indicator.svelte';
	//Components:
	// import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	// import AppSidebar from '#lib/components/app-sidebar.svelte';
	import AppSidebar from '#lib/components/layout/sidebar/app-sidebar.svelte';
	import SidebarWrapper from '#lib/components/layout/sidebar/sidebar-wrapper.svelte';
	import SidebarMain from '#lib/components/layout/sidebar/sidebar-main.svelte';
	//import SidebarToggle from '#lib/components/layout/sidebar/sidebar-toggle.svelte';
	import PageContent from '#lib/components/layout/page/page-content.svelte';
	import { store } from '#lib/local/app/store.svelte.js';
	import { onMount } from 'svelte';
	import { sidebar } from '#lib/components/layout/sidebar/sidebar_state.svelte.js';

	let { children } = $props();

	onMount(async () => {
		console.log('before sidebar init');
		await sidebar.initialize();
		console.log('after sidebar init');
	});

	// $effect(() => {
	// 	if ($session?.data) {
	// 		log.info($session.data.session);
	// 	}
	// });
</script>

<UserIndicator />

{#if store.initialized && sidebar.initialized}
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
