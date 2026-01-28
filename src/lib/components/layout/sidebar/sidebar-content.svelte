<script lang="ts">
	let { children } = $props();
</script>

<div class="flex flex-col flex-1">
	{@render children()}
</div>
