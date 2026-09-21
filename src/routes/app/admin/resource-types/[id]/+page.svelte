<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Card from '#lib/components/ui/card/index.js';
	import Button from '#lib/components/ui/button/button.svelte';
	import Input from '#lib/components/ui/input/input.svelte';
	import Textarea from '#lib/components/ui/textarea/textarea.svelte';
	import Label from '#lib/components/ui/label/label.svelte';
	import Icon from '#lib/components/features/icons/icon.svelte';
	import IconPicker from '#lib/components/features/icons/icon-picker.svelte';
	import FieldsEditor from '#lib/components/features/resource-type/resource-type-fields-editor.svelte';
	import { normalizeFieldConfig } from '#lib/components/features/resource-type/resource-type-fields.js';
	import { LiveQuery } from '#lib/local/db/live.svelte.js';
	import { ResourcesTypes } from '#lib/local/repositories/ResourceTypes.js';
	import type { ResourceFieldConfig } from '#lib/local/db/schema.js';

	const id = $derived(page.params.id);

	const resource_type_query = new LiveQuery(() =>
		id ? new ResourcesTypes().getResourceTypeById(id) : null
	);

	const resource_type = $derived(resource_type_query.data?.[0]);

	let singular = $derived(resource_type?.singular ?? '');
	let plural = $derived(resource_type?.plural ?? '');
	let description = $derived(resource_type?.description ?? '');
	let icon = $derived<string | null>(resource_type?.icon ?? null);
	let fields = $derived<ResourceFieldConfig[]>(
		(resource_type?.field_config ?? []).map((f) => ({ ...f }))
	);
	let saving = $state(false);

	async function save() {
		if (!resource_type) return;
		saving = true;
		try {
			const patch: Record<string, unknown> = {};
			if (singular.trim() !== resource_type.singular) patch.singular = singular.trim();
			if (plural.trim() !== resource_type.plural) patch.plural = plural.trim();
			if (description !== (resource_type.description ?? '')) {
				patch.description = description ? description : null;
			}
			if (icon !== (resource_type.icon ?? null)) patch.icon = icon;

			const field_config = normalizeFieldConfig(fields);
			if (
				JSON.stringify(field_config) !==
				JSON.stringify(normalizeFieldConfig(resource_type.field_config))
			) {
				patch.field_config = field_config;
			}

			if (Object.keys(patch).length > 0) {
				await new ResourcesTypes().updateResourceType(resource_type.id, patch);
			}
			await goto(resolve('/app/admin/resource-types'));
		} finally {
			saving = false;
		}
	}
</script>

{#if !resource_type}
	<p class="text-muted-foreground text-sm">Resource type not found.</p>
{:else}
	<Card.Root>
		<Card.Header>
			<Card.Title>
				<div class="flex flex-row items-center gap-2">
					{#if icon}
						<Icon icon_name={icon} />
					{/if}
					<span>Edit {resource_type.singular}</span>
				</div>
			</Card.Title>
			<Card.Description>Manage this app-wide resource type</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-4">
			<div class="grid grid-cols-[80px_1fr] items-center gap-2">
				<Label for="rt-icon">Icon</Label>
				<IconPicker bind:value={icon} context="resource_type" class="flex-1" />
			</div>

			<div class="grid grid-cols-[80px_1fr] items-center gap-2">
				<Label for="rt-key">Key</Label>
				<Input id="rt-key" value={resource_type.key} disabled />
			</div>

			<div class="grid grid-cols-[80px_1fr] items-center gap-2">
				<Label for="rt-singular">Singular</Label>
				<Input id="rt-singular" bind:value={singular} placeholder="Note" required />
			</div>

			<div class="grid grid-cols-[80px_1fr] items-center gap-2">
				<Label for="rt-plural">Plural</Label>
				<Input id="rt-plural" bind:value={plural} placeholder="Notes" required />
			</div>

			<div class="grid grid-cols-[80px_1fr] items-start gap-2">
				<Label for="rt-description">Description</Label>
				<Textarea
					id="rt-description"
					bind:value={description}
					placeholder="Optional description"
					rows={2} />
			</div>

			<div class="grid grid-cols-[80px_1fr] items-start gap-2">
				<Label>Fields</Label>
				<div class="flex flex-col gap-2">
					<p class="text-muted-foreground text-xs">Fields shown on each resource of this type</p>
					<FieldsEditor bind:fields />
				</div>
			</div>
		</Card.Content>

		<Card.Footer class="justify-end gap-2">
			<Button href={resolve('/app/admin/resource-types')} variant="outline">Cancel</Button>
			<Button disabled={saving || !singular.trim() || !plural.trim()} onclick={save}>
				{#if saving}Saving…{:else}Save{/if}
			</Button>
		</Card.Footer>
	</Card.Root>
{/if}
