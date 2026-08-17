<script lang="ts">
	import Button from '#lib/components/ui/button/button.svelte';
	import { tree, type TreeNode } from '#lib/local/utils/tree.svelte.js';
	import { app_context as app } from '#lib/local/app/app-context.svelte.js';
	import { Resources } from '#lib/local/repositories/Resources.js';
	import type { Snippet } from 'svelte';
	import ChevronDownIcon from '~icons/tabler/chevron-down';
	import ChevronRightIcon from '~icons/tabler/chevron-right';
	import Plus from '~icons/tabler/plus';
	import TreeNodeMenu from './tree-node-menu.svelte';
	import { cn, generateRandomNoteTitle } from '#lib/utils.js';
	let { node, children }: { node: TreeNode; children?: Snippet } = $props();

	let open = $derived(tree.open_nodes.has(node.id));
	async function addChild(parent_id: string) {
		if (!app.current_space) return;
		await new Resources().createResource({
			type: app.current_space.default_resource_type,
			name: generateRandomNoteTitle(),
			space_id: app.current_space.id,
			parent_id
		});
	}
</script>

<div class="px-2">
	<div
		onclick={() => {}}
		onkeydown={() => {}}
		tabindex="-1"
		role="button"
		class="group/node w-full flex flex-row p-0.5 h-8">
		<div
			class="w-full flex cursor-pointer items-center justify-between overflow-hidden rounded-md group-hover/node:bg-indigo-300">
			<div class="fade-right flex grow flex-row items-center gap-0.5 overflow-hidden pl-1">
				<Button
					variant="ghost"
					size="icon-2xs"
					onclick={(e) => {
						e.stopPropagation();
						tree.toggleNode(node.id);
					}}
					class={cn(node.children.length == 0 && 'invisible', 'size-5 rounded-sm')}>
					{#if !open}
						<ChevronRightIcon class="size-4 text-primary/70" />
					{:else}
						<ChevronDownIcon class="size-4 text-primary/70" />
					{/if}
				</Button>
				<div class="text-[0.85rem] text-nowrap">
					{node.name}
					<!-- <button onclick={() => new Resources().moveUp(node.id, node.parent_id, app.current_space!.id!)}
			>↑</button>
		<button
			onclick={() => new Resources().moveDown(node.id, node.parent_id, app.current_space!.id!)}
			>↓</button>
		<button onclick={() => new Resources().deleteResource(node.id, app.current_space!.id!)}
			>X</button>
		<button onclick={() => addChild(node.id)}>+</button> -->
				</div>
			</div>
			<TreeNodeMenu>
				<Button
					variant="ghost"
					size="icon-2xs"
					class="hidden group-hover/node:inline-flex rounded-sm size-5"
					onclick={(e: MouseEvent) => {
						e.stopPropagation();
						addChild(node.id);
						// if (current.user && current.space) {
						// 	createRecord(current.space.id, record_id);
						// }
					}}>
					<Plus class="size-4 text-primary/70" />
				</Button>
			</TreeNodeMenu>
		</div>
	</div>
	{#if open}
		{@render children?.()}
	{/if}
</div>
