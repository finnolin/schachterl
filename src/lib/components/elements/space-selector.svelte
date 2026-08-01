<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { Space } from '$lib/local/db/schema';
	import { Spaces } from '$lib/local/repositories/Spaces';
	import { type HTMLBaseAttributes } from 'svelte/elements';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { NOTE_TYPE_ID } from '$lib/local/utils/ids';
	import { app_context as app } from '$lib/local/app/app-context.svelte';

	let { class: className, ...rest_props }: WithElementRef<HTMLBaseAttributes> = $props();

	const spaces = $derived(app.spaces_query?.current ?? []);

	let open = $state(false);

	let selected_space = $derived(app.space);
	let triggerRef = $state<HTMLButtonElement>(null!);

	const selectedValue = $derived(spaces.find((f: Space) => f.id === selected_space?.id)?.name);
	let value_input = $state('');
	// We want to refocus the trigger button when the user selects
	// an item from the list so users can continue navigating the
	// rest of the form with the keyboard.
	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef.focus();
		});
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef} class={className}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				class="w-[200px] justify-between"
				role="combobox"
				aria-expanded={open}>
				{selectedValue || 'Select a framework...'}
				<ChevronsUpDownIcon class="opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-[200px] p-0">
		<Command.Root>
			<Command.Input bind:value={value_input} placeholder="Search spaces..." />
			<Command.List>
				<Command.Empty class="flex flex-col gap-2 p-2">
					Not found...
					{#if value_input.length >= 3}
						<Button
							size="sm"
							variant="outline"
							onclick={async () => {
								const name = value_input;
								open = false;
								value_input = '';
								await tick(); // Command fully unmounted now
								const new_space = await new Spaces().createSpace({
									name,
									default_resource_type: NOTE_TYPE_ID
								});
								await goto(resolve('/space/[id]', { id: new_space.id }));
							}}>Create {value_input}</Button>
					{/if}
				</Command.Empty>
				<Command.Group value="spaces">
					{#each spaces as space (space.id)}
						<Command.Item
							keywords={[space.name]}
							value={space.id}
							onSelect={async () => {
								goto(resolve('/space/[id]', { id: space.id }));
								closeAndFocusTrigger();
							}}>
							<CheckIcon class={cn(selected_space?.id !== space.id && 'text-transparent')} />
							{space.name}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
