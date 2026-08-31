<script lang="ts">
	import * as Resizable from '#lib/components/ui/resizable/index.js';
	import type { Pane } from '#lib/components/ui/resizable/index.js';
	import { sidebar } from './sidebar_state.svelte';
	import { cn } from '#lib/utils.js';
	import { onMount } from 'svelte';
	import { store } from '#lib/local/app/store.svelte.js';

	let { children } = $props();

	let containerWidth = $state(0);
	//let is_collapsed = $derived(sidebar.sidebar_collapsed);
	let is_collapsed = $derived(sidebar.sidebar_collapsed);
	let isAnimating = $state(false);
	let default_size = $derived(sidebar.size);

	const MIN_PX = 150;
	const MAX_PX = 500;

	let minSize = $derived(containerWidth ? (MIN_PX / containerWidth) * 100 : 10);
	let maxSize = $derived(containerWidth ? (MAX_PX / containerWidth) * 100 : 30);
	let collapsed_size = 0;

	let pane: ReturnType<typeof Pane>;
	let init: boolean = false;

	onMount(async () => {
		// if (store.sidebar_collapsed) {
		// 	console.log('sidebar onmount collapsed:', store.sidebar_collapsed);
		// 	pane.collapse();
		// }
		// console.log('before sidebar init');
		// await sidebar.initialize();
		// console.log('after sidebar init');
		//console.log(sidebar.);
		// if (pane && sidebar.size > 0) {
		// 	default_size = sidebar.size;
		// 	pane.resize(sidebar.size);
		// }
	});

	function toggleCollapse() {
		console.log('sidebar toggleCollapse');
		isAnimating = true;
		if (is_collapsed) {
			//sidebar.sidebar_collapsed = false;

			pane.expand();
		} else {
			//sidebar.sidebar_collapsed = true;
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
		//is_collapsed = true;
		init = true;
		store.setProperty('sidebar_collapsed', 'true');
		sidebar.sidebar_collapsed = true;
	}}
	onExpand={() => {
		if (store.sidebar_collapsed === 'true' && init == false) {
			pane.collapse();
			return;
		}
		//is_collapsed = false;
		store.setProperty('sidebar_collapsed', 'false');
		sidebar.sidebar_collapsed = false;
	}}
	onResize={(size) => {
		// PaneForge emits onResize when collapsing (size === collapsedSize).
		// Don't overwrite the remembered expanded width with collapsed width.
		if (size > collapsed_size) {
			sidebar.setSidebarSize(size);
		}
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
