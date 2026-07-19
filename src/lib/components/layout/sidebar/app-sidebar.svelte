<script lang="ts">
	import SidebarHeader from './sidebar-header.svelte';
	import SidebarContent from './sidebar-content.svelte';
	import SidebarFooter from './sidebar-footer.svelte';
	import Sidebar from './sidebar.svelte';
	import ModeToggle from '$lib/components/app-mode-toggle.svelte';

	import { resolve } from '$app/paths';

	// States:
	import { app_context } from '$lib/local/app/app-context.svelte';
	import { store } from '$lib/local/app/store.svelte';
	import { auth } from '$lib/local/auth/auth.svelte';
</script>

<Sidebar>
	<SidebarHeader>header</SidebarHeader>
	<SidebarContent
		><div class="flex flex-col gap-2"><a href={resolve('/test')}>Test</a></div></SidebarContent>
	<SidebarFooter>
		<ModeToggle />
		{#if store.server_url}
			<div class="p-1">Server: {store.server_url}</div>
			{#if app_context.is_tauri}
				<button>Change Server</button>
			{/if}
		{:else}
			<a href={resolve('/settings/server')}>Connect to a Server</a>
		{/if}

		{#if auth.session}
			<div class="p-1">User: {store.user_id}</div>
			<button
				onclick={() => {
					auth.logout();
				}}>Logout</button>
		{/if}
	</SidebarFooter>
</Sidebar>
