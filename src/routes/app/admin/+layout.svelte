<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/ui/button/button.svelte';

	let { children } = $props();

	const nav = [
		{ href: resolve('/app/admin'), label: 'Overview' },
		{ href: resolve('/app/admin/resource-types'), label: 'Resource types' },
		{ href: resolve('/app/admin/users'), label: 'Users' }
	] as const;
</script>

<section class="space-y-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Admin</h1>
		<p class="text-muted-foreground text-sm">Manage app-wide settings and entities.</p>
	</header>

	<nav class="flex flex-wrap gap-2">
		{#each nav as item (item.href)}
			<Button
				href={item.href}
				variant={page.url.pathname === item.href ? 'default' : 'outline'}
				size="sm">
				{item.label}
			</Button>
		{/each}
	</nav>

	{@render children?.()}
</section>
