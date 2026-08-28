<script lang="ts">
	import { app_context } from '#lib/local/app/app-context.svelte.js';
	import Button from '#lib/components/ui/button/button.svelte';
	function setServer() {
		app_context.setServer('http://localhost:5173');
	}
</script>

server
<Button onclick={setServer}>http://localhost:5173/</Button>
