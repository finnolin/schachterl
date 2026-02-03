<script lang="ts">
	import SidebarHeader from './sidebar-header.svelte';
	import SidebarContent from './sidebar-content.svelte';
	import SidebarFooter from './sidebar-footer.svelte';
	import Sidebar from './sidebar.svelte';
	import ModeToggle from '$lib/components/app-mode-toggle.svelte';

	// States:
	import { app_context } from '$lib/local/app/app-context.svelte';
	import { store } from '$lib/local/app/store.svelte';
	import { auth } from '$lib/local/app/auth.svelte';
</script>

<Sidebar>
	<SidebarHeader>header</SidebarHeader>
	<SidebarContent><div class="flex flex-col gap-2"><a href="/test">Test</a></div></SidebarContent>
	<SidebarFooter>
		<ModeToggle />
		<div class="p-1">Server: {store.server_url}</div>
		{#if auth.session}
			<div class="p-1">User: {store.user_id}</div>
		{/if}
	</SidebarFooter>
</Sidebar>
