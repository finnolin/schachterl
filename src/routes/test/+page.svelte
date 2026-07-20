<script lang="ts">
	import { sync_client } from '$lib/local/sync';
	import { Resources } from '$lib/local/repositories/Resources';
	import { LiveQuery } from '$lib/local/utils/live-query.svelte';
	import { Spaces } from '$lib/local/repositories/Spaces';
	import { tree } from '$lib/local/utils/tree.svelte';
	import { buildNested, type TreeNode } from '$lib/local/utils/tree.svelte';

	const spaces = new LiveQuery(['spaces'], () => new Spaces().getSpaces());
	let current_space: string | undefined = $state();
	const resources = $derived(buildNested([...tree.rows.values()]));

	async function addResource() {
		if (!current_space) return;
		await new Resources().createResource({
			type: 'note',
			name: 'new note',
			space_id: current_space
		});
	}
	async function addChild(parent_id: string) {
		if (!current_space) return;
		await new Resources().createResource({
			type: 'note',
			name: 'child note',
			space_id: current_space,
			parent_id
		});
	}
	async function addSpace() {
		await new Spaces().createSpace({ name: 'Spaceee' });
	}
	async function setSpace(space_id: string) {
		await tree.load(space_id);
		current_space = space_id;
	}

	async function push() {
		await sync_client.push();
	}
	async function pull() {
		await sync_client.pull();
	}
</script>

<button onclick={addSpace}>addSpace</button>
<button onclick={push}>Push</button>
<button onclick={pull}>Pull</button>

<svelte:boundary>
	{#each spaces.current ?? [] as space (space.id)}
		<div>
			<button
				onclick={() => {
					setSpace(space.id);
				}}>{space.name}</button>
			{space.id}
			<button
				onclick={() => {
					new Spaces().deleteSpace(space.id);
				}}>X</button>
		</div>
	{/each}
	{#if current_space}
		<div>
			SPACE: {current_space}
		</div>
		<button onclick={addResource}>Add Resource</button>
		{#each resources as node (node.id)}
			{@render treeNode(node, 0)}
		{/each}
	{/if}

	{#snippet failed()}
		Failed
	{/snippet}
	{#snippet pending()}
		Loading
	{/snippet}
</svelte:boundary>

{#snippet treeNode(node: TreeNode, depth: number)}
	<div style="margin-left: {depth * 16}px">
		{node.name} - {node.sort_order}
		<button onclick={() => new Resources().moveUp(node.id, node.parent_id, current_space!)}
			>↑</button>
		<button onclick={() => new Resources().moveDown(node.id, node.parent_id, current_space!)}
			>↓</button>
		<button onclick={() => new Resources().deleteResource(node.id, current_space!)}>X</button>
		<button onclick={() => addChild(node.id)}>+</button>
	</div>

	{#each node.children as child (child.id)}
		{@render treeNode(child, depth + 1)}
	{/each}
{/snippet}
