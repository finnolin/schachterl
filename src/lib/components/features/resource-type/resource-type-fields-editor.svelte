<script lang="ts">
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import Button from '#lib/components/ui/button/button.svelte';
	import Input from '#lib/components/ui/input/input.svelte';
	import type { ResourceFieldConfig } from '#lib/local/db/schema.js';
	import { baseFields, fieldLabel } from './resource-type-fields.js';

	let { fields = $bindable<ResourceFieldConfig[]>([]) }: { fields?: ResourceFieldConfig[] } = $props();

	function hasField(field: string) {
		return fields.some((f) => f.field === field);
	}

	function addField(field: string) {
		if (hasField(field)) return;
		fields.push({ field });
	}

	function removeField(index: number) {
		fields.splice(index, 1);
	}
</script>

<div class="flex flex-col gap-2">
	{#each fields as f, i (f.field)}
		<div class="flex items-center gap-2">
			<Input
				id={`rt-field-${i}`}
				bind:value={f.label}
				placeholder={fieldLabel(f.field)}
				class="flex-1"
			/>
			<Button
				variant="ghost"
				size="icon"
				onclick={() => removeField(i)}
				aria-label={`Remove ${fieldLabel(f.field)} field`}>
				<span class="text-muted-foreground text-xs">✕</span>
			</Button>
		</div>
	{/each}

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button variant="outline" size="sm" class="w-fit">
				+ Add field
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start">
			{#each baseFields as b (b.field)}
				<DropdownMenu.Item disabled={hasField(b.field)} onclick={() => addField(b.field)}>
					{b.label}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
