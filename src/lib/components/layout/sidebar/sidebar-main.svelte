<script lang="ts">
	import * as Resizable from '#lib/components/ui/resizable/index.js';

	let { children } = $props();
</script>

<Resizable.Pane class="flex flex-col h-dvh">
	{@render children()}
</Resizable.Pane>
