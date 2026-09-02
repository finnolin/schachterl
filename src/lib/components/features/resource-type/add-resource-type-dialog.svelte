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
	import type { ResourceFieldConfig } from '#lib/local/db/schema.js';

	let {
		space_id,
		open = $bindable(false),
		onSaved
	}: {
		space_id?: string;
		open?: boolean;
		onSaved?: () => void;
	} = $props();

	let key = $state('');
	let singular = $state('');
	let plural = $state('');
	let description = $state('');
	let icon: string | null = $state(null);
	let fields = $state<ResourceFieldConfig[]>([]);
	let saving = $state(false);
	let error = $state<string | null>(null);

	function handleIconChange(_next: string | null) {
		// icon is kept in sync via bind:value
	}

	async function handleSave() {
		const clean_key = key.trim().toLowerCase().replace(/\s+/g, '-');
		const clean_singular = singular.trim();
		const clean_plural = plural.trim();

		if (!clean_key || !clean_singular || !clean_plural) return;

		saving = true;
		error = null;
		try {
			const existing = await new ResourcesTypes().getResourceTypes();
			if (existing.some((t) => t.key === clean_key)) {
				error = `A resource type with key "${clean_key}" already exists.`;
				return;
			}

			if (space_id) {
				await new ResourcesTypes().createResourceType({
					space_id,
					key: clean_key,
					singular: clean_singular,
					plural: clean_plural,
					icon: icon ?? null,
					description: description.trim() || null,
					field_config: normalizeFieldConfig(fields)
				});
			} else {
				await new ResourcesTypes().createGlobalResourceType({
					key: clean_key,
					singular: clean_singular,
					plural: clean_plural,
					icon: icon ?? null,
					description: description.trim() || null,
					field_config: normalizeFieldConfig(fields)
				});
			}

			open = false;
			onSaved?.();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create resource type';
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>
				<div class="flex flex-row items-center gap-2">
					{#if icon}
						<Icon icon_name={icon} />
					{/if}
					<span>Add resource type</span>
				</div>
			</Dialog.Title>
			<Dialog.Description>
				{space_id
					? 'Create a new resource type for this space'
					: 'Create a new resource type for this app'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-[80px_1fr] items-center gap-2">
				<Label for="rt-new-icon">Icon</Label>
				<div class="flex flex-row items-center gap-2">
					{#if icon}
						<Icon icon_name={icon} class="size-5 shrink-0" />
					{/if}
					<IconPicker bind:value={icon} callback={handleIconChange} context="resource_type" class="flex-1" />
				</div>
			</div>

			<div class="grid grid-cols-[80px_1fr] items-center gap-2">
				<Label for="rt-new-key">Key</Label>
				<Input
					id="rt-new-key"
					bind:value={key}
					placeholder="e.g. task"
					class="font-mono"
					required
				/>
			</div>

			<div class="grid grid-cols-[80px_1fr] items-center gap-2">
				<Label for="rt-new-singular">Singular</Label>
				<Input id="rt-new-singular" bind:value={singular} placeholder="Task" required />
			</div>

			<div class="grid grid-cols-[80px_1fr] items-center gap-2">
				<Label for="rt-new-plural">Plural</Label>
				<Input id="rt-new-plural" bind:value={plural} placeholder="Tasks" required />
			</div>

			<div class="grid grid-cols-[80px_1fr] items-start gap-2">
				<Label for="rt-new-description">Description</Label>
				<Textarea id="rt-new-description" bind:value={description} placeholder="Optional description" rows={2} />
			</div>

			<div class="grid grid-cols-[80px_1fr] items-start gap-2">
				<Label>Fields</Label>
				<div class="flex flex-col gap-2">
					<p class="text-muted-foreground text-xs">Fields shown on each resource of this type</p>
					<FieldsEditor bind:fields />
				</div>
			</div>
		</div>

		{#if error}
			<p class="text-destructive text-xs">{error}</p>
		{/if}

		<Dialog.Footer class="justify-end">
			<Button variant="outline" onclick={handleCancel}>Cancel</Button>
			<Button
				disabled={saving || !key.trim() || !singular.trim() || !plural.trim()}
				onclick={handleSave}>
				{#if saving}Creating…{:else}Add resource type{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
