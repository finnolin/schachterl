<script lang="ts">
	import SidebarHeader from './sidebar-header.svelte';
	import SidebarContent from './sidebar-content.svelte';
	import SidebarFooter from './sidebar-footer.svelte';
	import Sidebar from './sidebar.svelte';
	import ModeToggle from '$lib/components/app-mode-toggle.svelte';

	// States:
	import { app_context } from '$lib/local/app/app-context.svelte';
</script>

<Sidebar>
	<SidebarHeader>header</SidebarHeader>
	<SidebarContent>content</SidebarContent>
	<SidebarFooter>
		<ModeToggle />
		<div class="p-1">Server: {app_context.server_url}</div>
		{#if app_context.session}
			<div class="p-1">User: {app_context.user_id}</div>
		{/if}
	</SidebarFooter>
</Sidebar>
