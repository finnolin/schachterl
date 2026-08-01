<script lang="ts">
	import { page } from '$app/state';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';
	import { sidebar } from '$lib/components/layout/sidebar/sidebar_state.svelte';
	import Button from '../button/button.svelte';
	import SidebarIcon from '~icons/tabler/arrow-bar-right';
	import SettingsIcon from '~icons/lucide/settings';
	import SpaceSelector from '$lib/components/elements/space-selector.svelte';
	import ResourceBreadcumbs from '$lib/components/elements/resource-breadcumbs.svelte';
	import { app_context as app } from '$lib/local/app/app-context.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	type WithBG<T> = T & { hide_bg?: boolean | undefined };
	let {
		hide_bg,
		class: className,
		children,
		...rest_props
	}: WithBG<HTMLAttributes<HTMLDivElement>> = $props();

	function checkOpen() {
		//console.log(sidebar.isMobile);
		if (sidebar.is_collapsed) {
			return false;
		}
		return true;
	}

	function openSettings() {
		if (!app.focus) return;
		const { type, id } = app.focus;
		if (type === 'space') {
			goto(resolve('/space/[id]/settings', { id }));
		} else {
			goto(resolve('/resource/[id]/settings', { id }));
		}
	}
</script>

<div class="p-2 w-full flex flex-row items-center justify-start">
	{#if !checkOpen()}
		<div class="fixed z-50 transition-all">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={() => {
					sidebar.toggle();
				}}>
				<SidebarIcon class="size-4" />
				<span class="sr-only">Toggle Sidebar</span>
			</Button>
		</div>
	{/if}
	<div
		class={cn(
			'w-full transition-all sticky top-0 z-40 label flex flex-row gap-2 items-center h-9',
			!checkOpen() && 'pl-10',
			className
		)}
		{...rest_props}>
		{#if !checkOpen()}
			<SpaceSelector />
		{/if}
		<ResourceBreadcumbs class="pl-2" />
		<Button onclick={openSettings} variant="ghost" size="icon-sm"
			><SettingsIcon class="size-4" /></Button>
	</div>

	{@render children?.()}
</div>
