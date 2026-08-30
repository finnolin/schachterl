<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { cn } from '#lib/utils.js';

	type SpaceCardProps = {
		name: string;
		description?: string | null;
		resourceCount?: number;
		memberCount?: number;
		updatedAt?: Date | string | null;
		href?: string;
		onclick?: () => void;
		class?: string;
	};

	let {
		name,
		description = null,
		resourceCount,
		memberCount,
		updatedAt = null,
		href,
		onclick,
		class: className
	}: SpaceCardProps = $props();

	function formatCount(value: number | undefined, singular: string, plural: string) {
		if (typeof value !== 'number') return null;
		return `${value} ${value === 1 ? singular : plural}`;
	}

	const resourcesLabel = $derived(formatCount(resourceCount, 'resource', 'resources'));
	const membersLabel = $derived(formatCount(memberCount, 'member', 'members'));
	const updatedLabel = $derived(
		updatedAt
			? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
					updatedAt instanceof Date ? updatedAt : new Date(updatedAt)
				)
			: null
	);
</script>

{#snippet content()}
	<Card.Header>
		<Card.Title>{name}</Card.Title>
		{#if description}
			<Card.Description>{description}</Card.Description>
		{/if}
	</Card.Header>

	{#if resourcesLabel || membersLabel || updatedLabel}
		<Card.Content class="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
			{#if resourcesLabel}
				<span>{resourcesLabel}</span>
			{/if}
			{#if membersLabel}
				<span>• {membersLabel}</span>
			{/if}
			{#if updatedLabel}
				<span>• Updated {updatedLabel}</span>
			{/if}
		</Card.Content>
	{/if}
{/snippet}

{#if href}
	<a href={href} class="block rounded-lg focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none">
		<Card.Root class={cn('h-full transition-colors hover:bg-muted/40', className)}>
			{@render content()}
		</Card.Root>
	</a>
{:else if onclick}
	<button
		type="button"
		class="block w-full rounded-lg text-left focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
		{onclick}>
		<Card.Root class={cn('h-full transition-colors hover:bg-muted/40', className)}>
			{@render content()}
		</Card.Root>
	</button>
{:else}
	<Card.Root class={cn('h-full', className)}>
		{@render content()}
	</Card.Root>
{/if}
