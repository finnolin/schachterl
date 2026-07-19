<script lang="ts">
	import { app_context } from '$lib/local/app/app-context.svelte';
	function setServer() {
		app_context.setServer('http://localhost:5173');
	}
</script>

server
<button onclick={setServer}>http://localhost:5173/</button>
