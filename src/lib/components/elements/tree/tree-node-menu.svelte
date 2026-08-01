<script lang="ts">
	let { children } = $props();
</script>

<div class="flex items-center gap-0.5 p-1">
	{@render children()}
</div>
