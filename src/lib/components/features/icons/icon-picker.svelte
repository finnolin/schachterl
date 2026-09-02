<script lang="ts">
	import * as Popover from '#lib/components/ui/popover/index.js';
	import Button from '#lib/components/ui/button/button.svelte';
	import Input from '#lib/components/ui/input/input.svelte';
	import { cn } from '#lib/utils.js';

	import CheckIcon from '~icons/lucide/check';
	import ChevronsUpDownIcon from '~icons/lucide/chevrons-up-down';
	import {
		getIconOptionsForContext,
		type IconPickerContext
	} from '#lib/components/features/icons/icon-registry.js';

	let {
		value = $bindable<string | null>(null),
		context = 'resource_type',
		placeholder = 'Select an icon',
		disabled = false,
		callback,
		class: className
	}: {
		value?: string | null;
		context?: IconPickerContext;
		placeholder?: string;
		disabled?: boolean;
		callback?: (next: string | null) => void;
		class?: string;
	} = $props();

	let open = $state(false);
	let query = $state('');

	const available_icons = $derived(getIconOptionsForContext(context));
	const selected = $derived(available_icons.find((option) => option.value === value) ?? null);
	const filtered_icons = $derived(
		available_icons.filter((option) => {
			const q = query.trim().toLowerCase();
			if (!q) return true;
			return option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q);
		})
	);

	async function selectIcon(next: string | null) {
		console.log('set icon to:', next);

		value = next;
		open = false;
		query = '';
		if (callback) {
			await callback(next);
		}
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant="ghost"
				size="icon"
				class={cn('w-full justify-between', className)}
				{disabled}
				{...props}>
				{#if selected}
					<selected.icon class="size-6" />
				{:else}
					<span class="text-muted-foreground">{placeholder}</span>
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-[22rem]">
		<div class="space-y-2">
			<Input placeholder="Search icon..." bind:value={query} />
			<Button
				variant="ghost"
				size="sm"
				class="w-full justify-start"
				onclick={async () => selectIcon(null)}>
				No icon
			</Button>
		</div>

		<div class="max-h-72 overflow-auto rounded-md border">
			{#each filtered_icons as option (option.value)}
				<button
					type="button"
					class="hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between gap-3 p-2 text-left text-sm"
					onclick={async () => selectIcon(option.value)}>
					<span class="flex min-w-0 items-center gap-2">
						<option.icon class="size-4 shrink-0" />
						<span class="truncate">{option.label}</span>
						<span class="text-muted-foreground text-xs">({option.value})</span>
					</span>
					{#if value === option.value}
						<CheckIcon class="size-4" />
					{/if}
				</button>
			{:else}
				<p class="text-muted-foreground p-3 text-sm">No icons found.</p>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>
