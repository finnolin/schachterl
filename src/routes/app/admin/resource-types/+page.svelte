<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Card from '#lib/components/ui/card/index.js';
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Item from '#lib/components/ui/item/index.js';
	import Icon from '#lib/components/features/icons/icon.svelte';
	import { LiveQuery } from '#lib/local/utils/live-query.svelte.js';
	import { ResourcesTypes } from '#lib/local/repositories/ResourceTypes.js';
	import AddResourceTypeDialog from '#lib/components/features/resource-type/add-resource-type-dialog.svelte';

	const resource_types_query = new LiveQuery(['resource_types'], () =>
		new ResourcesTypes().getResourceTypes()
	);
	const resource_types = $derived(resource_types_query.current ?? []);
	const loading = $derived(resource_types_query.loading);

	let add_dialog_open = $state(false);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Resource types</Card.Title>
		<Card.Description>App-wide resource type definitions.</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if loading}
			<p class="text-muted-foreground text-sm">Loading resource types...</p>
		{:else if resource_types.length === 0}
			<p class="text-muted-foreground text-sm">No resource types yet.</p>
		{:else}
			<div class="flex flex-col gap-2">
				{#each resource_types as resource_type (resource_type.id)}
					<Item.Root variant="outline">
						<Item.Content>
							<Item.Title>
								<div class="flex flex-row items-center gap-2">
									{#if resource_type.icon}
										<Icon icon_name={resource_type.icon} />
									{/if}
									<span>{resource_type.singular}</span>
								</div>
								<span class="text-muted-foreground">({resource_type.plural})</span>
							</Item.Title>
							<Item.Description>key: {resource_type.key}</Item.Description>
						</Item.Content>
						<Item.Actions>
							<Button
								href={resolve('/app/admin/resource-types/[id]', { id: resource_type.id })}
								variant="outline"
								size="sm">Edit</Button>
						</Item.Actions>
					</Item.Root>
				{/each}
			</div>
		{/if}
	</Card.Content>
	<Card.Footer>
		<Button class="w-full" variant="outline" onclick={() => (add_dialog_open = true)}
			>Add resource type</Button>
	</Card.Footer>
</Card.Root>

{#if add_dialog_open}
	{#key add_dialog_open}
		<AddResourceTypeDialog bind:open={add_dialog_open} />
	{/key}
{/if}
