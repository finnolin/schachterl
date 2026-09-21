<script lang="ts">
	import { app_context } from '#lib/local/app/app-context.svelte.js';
	import { auth } from '#lib/local/auth/auth.svelte.js';
	import { Spaces } from '#lib/local/repositories/Spaces.js';
	import { ResourcesTypes } from '#lib/local/repositories/ResourceTypes.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Item from '#lib/components/ui/item/index.js';
	import Icon from '#lib/components/features/icons/icon.svelte';
	import { LiveQuery } from '#lib/local/db/live.svelte.js';
	import EditResourceTypeDialog, {
		type EditableResourceType
	} from '#lib/components/features/resource-type/edit-resource-type-dialog.svelte';
	import type { EnumSpaceRole } from '#lib/local/db/schema.js';

	import IconPicker from '#lib/components/features/icons/icon-picker.svelte';
	import * as Command from '#lib/components/ui/command/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import ChevronsUpDownIcon from '~icons/lucide/chevrons-up-down';
	async function callback(next: string | null) {
		console.log('icon picker space callback: ', next);
		await new Spaces().updateSpace(app_context.current_space!.id, { icon: next });
	}

	// live_space auto-refetches on notify(); current_space is the fallback while booting
	let space = $derived(app_context.current_space);
	let icon = $derived(space?.icon);

	const space_resource_type_query = new LiveQuery(() =>
		space?.id ? new ResourcesTypes().getSpaceResourceTypes(space.id) : null
	);

	const space_resource_types = $derived(space_resource_type_query?.data ?? []);

	let current_space_user = $derived(space?.space_users.find((su) => su.user_id === auth.user?.id));
	let space_user_role: EnumSpaceRole | null = $derived(current_space_user?.role ?? null);
	let can_edit = $derived(space_user_role === 'owner' || space_user_role === 'editor');

	const available_resource_type_query = new LiveQuery(() =>
		space?.id ? new ResourcesTypes().getSpaceResourceTypes(space.id) : null
	);

	const available_resource_types = $derived(available_resource_type_query.data ?? []);

	let editing_resource_type = $state<EditableResourceType | null>(null);
	let edit_dialog_open = $state(false);
	let add_resource_type_open = $state(false);
	let add_resource_type_query = $state('');

	function openEditDialog(resource_type: EditableResourceType) {
		editing_resource_type = resource_type;
		edit_dialog_open = true;
	}

	async function addResourceType(resource_type_id: string) {
		if (!space) return;
		await new ResourcesTypes().addResourceTypeToSpace(space.id, resource_type_id);
		add_resource_type_open = false;
		add_resource_type_query = '';
	}
</script>

{#if space}
	<div class="flex flex-col w-full items-center">
		<div class="flex flex-col gap-4 w-full max-w-5xl">
			<div class="flex flex-row gap-1 items-center w-full">
				<IconPicker {callback} bind:value={icon} context="space" />
				<h1 class="text-xl font-bold">{space.name}</h1>
			</div>

			<Card.Root class="w-full max-w-5xl">
				<Card.Header>
					<Card.Title>Resource types</Card.Title>
					<Card.Description>Manage the resource types available in this space</Card.Description>
					<!-- <Card.Action><Button>TEST</Button></Card.Action> -->
				</Card.Header>
				<Card.Content
					><div class="flex flex-col gap-2">
						{#each space_resource_types as resource_type (resource_type.id)}
							<Button variant="ghost" size="none" onclick={() => openEditDialog(resource_type)}>
								<Item.Root variant="outline">
									<Item.Content>
										<Item.Title>
											<div class="flex flex-row items-center gap-2">
												{#if resource_type.icon}
													<Icon icon_name={resource_type.icon} />
												{/if}{resource_type.singular}
											</div>
											<span class="text-muted-foreground">({resource_type.plural})</span
											>{#if resource_type.id != space.default_resource_type}
												<Button
													size="none"
													variant="ghost"
													onclick={(e) => {
														e.stopPropagation();
														new Spaces().setDefaultResourceType(space.id, resource_type.id);
													}}>Set default</Button>
											{/if}</Item.Title>
										<Item.Description>key: {resource_type.key}</Item.Description>
									</Item.Content>
									<Item.Actions>
										<Button
											onclick={(e) => {
												e.stopPropagation();
												new ResourcesTypes().removeResourceTypeFromSpace(
													space.id,
													resource_type.id
												);
											}}
											variant="outline"
											size="sm"
											disabled={!can_edit}>Remove</Button>
									</Item.Actions>
								</Item.Root>
							</Button>
						{/each}
					</div></Card.Content>
				<Card.Footer class="flex-col gap-2">
					<Popover.Root bind:open={add_resource_type_open}>
						<Popover.Trigger class="w-full">
							{#snippet child({ props })}
								<Button
									variant="outline"
									class="w-full justify-between"
									role="combobox"
									aria-expanded={add_resource_type_open}
									disabled={!can_edit || available_resource_types.length === 0}
									{...props}>
									{available_resource_types.length === 0
										? 'All resource types already added'
										: 'Add resource type'}
									<ChevronsUpDownIcon class="size-4 opacity-50" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0">
							<Command.Root>
								<Command.Input
									bind:value={add_resource_type_query}
									placeholder="Search resource types..." />
								<Command.List>
									<Command.Empty class="text-muted-foreground p-2 text-sm"
										>No available resource types.</Command.Empty>
									<Command.Group value="resource-types">
										{#each available_resource_types as resource_type (resource_type.id)}
											<Command.Item
												value={resource_type.id}
												keywords={[resource_type.singular, resource_type.plural, resource_type.key]}
												onSelect={async () => addResourceType(resource_type.id)}>
												<div class="flex min-w-0 items-center gap-2">
													{#if resource_type.icon}
														<Icon icon_name={resource_type.icon} />
													{/if}
													<span class="truncate">{resource_type.singular}</span>
													<span class="text-muted-foreground">({resource_type.plural})</span>
												</div>
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</Card.Footer>
			</Card.Root>
		</div>
	</div>

	{#if editing_resource_type}
		{#key edit_dialog_open}
			<EditResourceTypeDialog resource_type={editing_resource_type} bind:open={edit_dialog_open} />
		{/key}
	{/if}
{/if}
