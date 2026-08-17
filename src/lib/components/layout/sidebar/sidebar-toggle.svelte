<script lang="ts">
	import { sidebar } from './sidebar_state.svelte';
	import Button from '#lib/components/ui/button/button.svelte';
	import SidebarIcon from '~icons/lucide/sidebar-open';

	function checkOpen() {
		if (sidebar.is_collapsed) {
			return false;
		}
		return true;
	}
</script>

{#if !checkOpen()}
	<div class="fixed z-50 transition-all">
		<Button
			variant="ghost"
			size="icon"
			onclick={() => {
				sidebar.toggle();
			}}>
			<!-- <SidebarIcon /> -->
			<span class="sr-only">Toggle Sidebar</span>
		</Button>
	</div>
{/if}
