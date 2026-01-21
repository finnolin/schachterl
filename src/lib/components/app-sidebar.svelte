<script lang="ts">
	// Components:
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ModeToggle from './app-mode-toggle.svelte';

	// States:
	import { app_context } from '$lib/local/app/app-context.svelte';
	import Button from './ui/button/button.svelte';
</script>

<Sidebar.Root>
	<Sidebar.Content />
	<Sidebar.Rail />
	<Button variant="destructive">hello</Button>
	<Sidebar.Footer>
		<ModeToggle />
		<div class="p-1">Server: {app_context.server_url}</div>
	</Sidebar.Footer>
</Sidebar.Root>
