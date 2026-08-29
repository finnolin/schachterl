<script lang="ts">
	import PageHeader from '#lib/components/ui/page/page-header.svelte';
	import UserIndicator from '#lib/components/elements/user-popover/user-indicator.svelte';
	//Components:
	// import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	// import AppSidebar from '#lib/components/app-sidebar.svelte';
	import AppSidebar from '#lib/components/layout/sidebar/app-sidebar.svelte';
	import SidebarWrapper from '#lib/components/layout/sidebar/sidebar-wrapper.svelte';
	import SidebarMain from '#lib/components/layout/sidebar/sidebar-main.svelte';
	//import SidebarToggle from '#lib/components/layout/sidebar/sidebar-toggle.svelte';
	import PageContent from '#lib/components/ui/page/page-content.svelte';

	let { children } = $props();

	// $effect(() => {
	// 	if ($session?.data) {
	// 		log.info($session.data.session);
	// 	}
	// });
</script>

<UserIndicator />

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
