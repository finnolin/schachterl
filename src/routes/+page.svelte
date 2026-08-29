<script lang="ts">
	import { app_context } from '#lib/local/app/app-context.svelte.js';
	import { Progress } from '#lib/components/ui/progress/index.js';

	const percent = $derived((app_context.boot_step / app_context.boot_total_steps) * 100);
</script>

<div class="flex h-screen w-full flex-col items-center justify-center gap-4">
	<h1 class="text-lg font-medium">Welcome</h1>
	<div class="flex w-full max-w-sm flex-col gap-2">
		<Progress value={percent} />
		<p class="text-muted-foreground text-center text-sm">{app_context.boot_label}</p>
	</div>
</div>
