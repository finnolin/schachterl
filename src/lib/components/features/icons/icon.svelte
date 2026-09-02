<script lang="ts">
	import { getIconComponent } from '#lib/components/features/icons/icon-registry.js';
	let { icon_name, class: className }: { icon_name: string; class?: string } = $props();

	let Component = $derived(getIconComponent(icon_name));
</script>

<Component class={className} />
