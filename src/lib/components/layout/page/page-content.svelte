<script lang="ts">
	let { children } = $props();
</script>

<div class="p-2 flex-1 overflow-auto">
	{@render children()}
</div>
