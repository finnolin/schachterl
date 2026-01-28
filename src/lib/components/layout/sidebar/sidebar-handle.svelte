<script lang="ts">
	import { cn } from '$lib/utils';
	import { PaneResizer } from 'paneforge';
	import { sidebar } from './sidebar_state.svelte';
	let mouse_down_time = 0;
	let mouse_down_x = 0;
	let mouse_down_y = 0;

	const click_threshold_ms = 200;
	const click_trheshold_px = 5;

	let dragging = $state(false);

	function handleMouseDown(e: MouseEvent) {
		mouse_down_time = Date.now();
		mouse_down_x = e.clientX;
		mouse_down_y = e.clientY;
	}

	function handleMouseUp(e: MouseEvent) {
		const elapsed = Date.now() - mouse_down_time;
		const d_x = Math.abs(e.clientX - mouse_down_x);
		const d_y = Math.abs(e.clientY - mouse_down_y);

		const is_click =
			elapsed < click_threshold_ms && d_x < click_trheshold_px && d_y < click_trheshold_px;

		if (is_click) {
			sidebar.toggle();
		}
	}

	function toggleDragging() {
		dragging = !dragging;
		if (!dragging) {
			sidebar.saveLayout();
		}
	}
</script>

<PaneResizer
	aria-label="Toggle Sidebar"
	onmousedown={handleMouseDown}
	onmouseup={handleMouseUp}
	onDraggingChange={toggleDragging}
	class={cn(
		'relative w-px bg-border transition-colors duration-100 delay-20 after:absolute after:inset-y-0 after:start-1/2 after:w-1.5 after:transition-all after:delay-20 after:duration-100 hover:after:bg-border',
		sidebar.is_collapsed ? 'after:translate-x-0' : 'after:-translate-x-1/2'
	)} />
