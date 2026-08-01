<script lang="ts">
	import { resolve } from '$app/paths';

	// Ui:
	import SidebarHeader from './sidebar-header.svelte';
	import SidebarContent from './sidebar-content.svelte';
	import SidebarFooter from './sidebar-footer.svelte';
	import Sidebar from './sidebar.svelte';
	import ModeToggle from '$lib/components/app-mode-toggle.svelte';
	import SpaceSelector from '$lib/components/elements/space-selector.svelte';
	import SidebarIcon from '~icons/tabler/arrow-bar-left';
	import { Button } from '$lib/components/ui/button';
	import TreeNodeItem from '$lib/components/elements/tree/tree-node-item.svelte';
	// States:
	import { app_context as app } from '$lib/local/app/app-context.svelte';
	import { store } from '$lib/local/app/store.svelte';
	import { auth } from '$lib/local/auth/auth.svelte';
	import { sidebar } from './sidebar_state.svelte';
	import { tree, buildNested, type TreeNode } from '$lib/local/utils/tree.svelte';

	// Repos:
	import { Resources } from '$lib/local/repositories/Resources';

	const resources = $derived(buildNested([...tree.rows.values()]));
	async function addResource() {
		if (!app.current_space) return;
		await new Resources().createResource({
			type: 'note',
			name: 'new note',
			space_id: app.current_space.id
		});
	}
	async function addChild(parent_id: string) {
		if (!app.current_space) return;
		await new Resources().createResource({
			type: 'note',
			name: 'child note',
			space_id: app.current_space.id,
			parent_id
		});
	}
</script>

<Sidebar>
	<SidebarHeader>
		<div class="flex flex-row w-full items-center p-2 gap-2 justify-between">
			<SpaceSelector />
			<Button
				onclick={() => {
					sidebar.collapse();
				}}
				variant="ghost"
				size="icon-sm"><SidebarIcon /></Button>
		</div>
	</SidebarHeader>
	<SidebarContent>
		<div class="flex flex-col">
			{#if app.space}
				{#each resources as node (node.id)}
					{@render treeNode(node, 0)}
				{/each}
			{/if}
		</div>
	</SidebarContent>
	<SidebarFooter>
		<ModeToggle />
	</SidebarFooter>
</Sidebar>
{#snippet treeNode(node: TreeNode, depth: number)}
	<TreeNodeItem {node}>
		{#each node.children as child (child.id)}
			{@render treeNode(child, depth + 1)}
		{/each}
	</TreeNodeItem>
{/snippet}
