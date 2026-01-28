<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import SidebarHandle from './sidebar-handle.svelte';
	import { sidebar } from './sidebar_state.svelte';
	import type { WithElementRef } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	type Props = WithElementRef<
		{
			sidebar_content: Snippet;
			children: Snippet;
			frame?: boolean;
		},
		HTMLDivElement
	>;

	let { sidebar_content, children, frame = true }: Props = $props();
</script>

<div class={cn('h-dvh bg-accent', frame && 'p-2')}>
	<Resizable.PaneGroup
		direction="horizontal"
		class={cn('w-full bg-background', frame && 'rounded-lg border')}>
		{@render sidebar_content()}
		<!-- <Resizable.Handle onmousedown={handleMouseDown} onmouseup={handleMouseUp} /> -->
		<SidebarHandle />
		<button
			onclick={() => {
				sidebar.toggle();
			}}>BEB</button>
		{@render children()}
	</Resizable.PaneGroup>
</div>
