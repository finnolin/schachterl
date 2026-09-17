<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '#lib/components/ui/button/button.svelte';
	import {
		Card,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '#lib/components/ui/card/index.js';
	import { auth } from '#lib/local/auth/auth.svelte.js';
	import ShieldXIcon from '~icons/lucide/shield-x';

	let { children } = $props();

	const nav = [
		{ href: resolve('/app/admin'), label: 'Overview' },
		{ href: resolve('/app/admin/resource-types'), label: 'Resource types' },
		{ href: resolve('/app/admin/users'), label: 'Users' }
	] as const;
</script>

{#if auth.isAdmin()}
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
{:else}
	<div class="flex w-full h-full items-center justify-center p-4">
		<Card class="w-full max-w-md text-center">
			<CardHeader>
				<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
					<ShieldXIcon class="size-6 text-muted-foreground" />
				</div>
				<CardTitle>Access denied</CardTitle>
				<CardDescription>
					You need administrator permissions to manage app-wide settings and entities.
				</CardDescription>
			</CardHeader>
			<CardFooter class="justify-center">
				<Button href={resolve('/app')} variant="outline">Back to app</Button>
			</CardFooter>
		</Card>
	</div>
{/if}
