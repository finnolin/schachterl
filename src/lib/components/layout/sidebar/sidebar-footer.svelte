<script lang="ts">
	let { children } = $props();
</script>

<div class="flex flex-col">
	{@render children()}
</div>
