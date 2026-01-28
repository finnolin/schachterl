<script lang="ts">
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import type { Pane } from '$lib/components/ui/resizable/index.js';
	import { sidebar } from './sidebar_state.svelte';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';

	let { children } = $props();

	let containerWidth = $state(0);
	let is_collapsed = $state(false);
	let isAnimating = $state(false);
	let default_size = $state(10);
	default_size = sidebar.size;

	const MIN_PX = 150;
	const MAX_PX = 500;

	let minSize = $derived(containerWidth ? (MIN_PX / containerWidth) * 100 : 10);
	let maxSize = $derived(containerWidth ? (MAX_PX / containerWidth) * 100 : 30);
	let collapsed_size = 0;

	let pane: ReturnType<typeof Pane>;

	function resize() {
		console.log('resize');
	}

	function toggleCollapse() {
		isAnimating = true;
		if (is_collapsed) {
			pane.expand();
		} else {
			pane.collapse();
		}
		setTimeout(() => {
			isAnimating = false;
		}, 200);
	}
	sidebar.register(toggleCollapse);
</script>

<svelte:window bind:innerWidth={containerWidth} onkeydown={sidebar.handleShortcutKeydown} />

<Resizable.Pane
	bind:this={pane}
	defaultSize={default_size}
	{minSize}
	{maxSize}
	data-collapsible={is_collapsed}
	collapsible={true}
	collapsedSize={collapsed_size}
	onCollapse={() => {
		is_collapsed = true;
		sidebar.is_collapsed = true;
	}}
	onExpand={() => {
		is_collapsed = false;
		sidebar.is_collapsed = false;
	}}
	onResize={(size) => {
		sidebar.setSidebarSize(size);
	}}
	class={cn(
		isAnimating && 'transition-all duration-200 ease-out',
		'flex h-full w-full flex-col overflow-hidden'
	)}>
	<!-- <button onclick={toggleCollapse}>
		{is_collapsed ? 'Expand' : 'Collapse'}
	</button> -->
	{@render children()}
</Resizable.Pane>
