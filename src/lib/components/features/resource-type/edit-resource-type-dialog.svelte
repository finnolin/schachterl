<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import Button from '#lib/components/ui/button/button.svelte';
	import Input from '#lib/components/ui/input/input.svelte';
	import Textarea from '#lib/components/ui/textarea/textarea.svelte';
	import Label from '#lib/components/ui/label/label.svelte';
	import Icon from '#lib/components/features/icons/icon.svelte';
	import IconPicker from '#lib/components/features/icons/icon-picker.svelte';
	import FieldsEditor from '#lib/components/features/resource-type/resource-type-fields-editor.svelte';
	import { normalizeFieldConfig } from '#lib/components/features/resource-type/resource-type-fields.js';
	import { ResourcesTypes } from '#lib/local/repositories/ResourceTypes.js';
	import type { ResourceType, ResourceFieldConfig } from '#lib/local/db/schema.js';

	export type EditableResourceType = Pick<
		ResourceType,
		'id' | 'key' | 'singular' | 'plural' | 'icon' | 'description' | 'field_config'
	>;

	let {
		resource_type,
		open = $bindable(false),
		onSaved
	}: {
		resource_type: EditableResourceType;
		open?: boolean;
		onSaved?: () => void;
	} = $props();

	let singular = $derived(resource_type.singular);
	let plural = $derived(resource_type.plural);
	let description = $derived(resource_type.description ?? '');
	let icon: string | null = $derived(resource_type.icon);
	let fields = $derived<ResourceFieldConfig[]>(
		(resource_type.field_config ?? []).map((f) => ({ ...f }))
	);
	let saving = $state(false);

	async function handleSave() {
		if (!singular.trim() || !plural.trim()) return;
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
			open = false;
			onSaved?.();
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="border-2 border-amber-300">
		<Dialog.Header>
			<Dialog.Title>
				<div class="flex flex-row items-center gap-2">
					{#if resource_type.icon}
						<Icon icon_name={resource_type.icon} />
					{/if}
					<span>Edit {resource_type.singular}</span>
				</div>
			</Dialog.Title>
			<Dialog.Description>Edit this resource type's display settings</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4">
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
		</div>

		<Dialog.Footer class="justify-end">
			<Button variant="outline" onclick={handleCancel}>Cancel</Button>
			<Button disabled={saving || !singular.trim() || !plural.trim()} onclick={handleSave}>
				{#if saving}Saving…{:else}Save{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
