<script lang="ts">
	import * as Item from '#lib/components/ui/item/index.js';
	import { LiveQuery } from '#lib/local/utils/live-query.svelte.js';
	import { Resources } from '#lib/local/repositories/Resources.js';
	import type { Space } from '#lib/local/db/schema.js';
	import { app_context as app } from '#lib/local/app/app-context.svelte.js';
	import { generateRandomNoteTitle } from '#lib/utils.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	let { space }: { space: Space } = $props();

	const resources_query = $derived(
		new LiveQuery(['resources', `space:${space.id}`], () =>
			new Resources().getResources({
				filter: { space_id: space.id },
				sort: { by: 'updated_at', dir: 'desc' }
			})
		)
	);
	const resources = $derived(resources_query.current ?? []);

	async function addResource() {
		if (!app.current_space) return;
		await new Resources().createResource({
			type: app.current_space.default_resource_type,
			name: generateRandomNoteTitle(),
			space_id: app.current_space.id
		});
	}

	function openResource(id: string) {
		goto(resolve('/app/resource/[id]', { id }));
	}

	const models = [
		{
			name: 'v0-1.5-sm',
			description: 'Everyday tasks and UI generation.',
			image:
				'https://images.unsplash.com/photo-1650804068570-7fb2e3dbf888?q=80&w=640&auto=format&fit=crop',
			credit: 'Valeria Reverdo on Unsplash'
		},
		{
			name: 'v0-1.5-lg',
			description: 'Advanced thinking or reasoning.',
			image:
				'https://images.unsplash.com/photo-1610280777472-54133d004c8c?q=80&w=640&auto=format&fit=crop',
			credit: 'Michael Oeser on Unsplash'
		},
		{
			name: 'v0-2.0-mini',
			description: 'Open Source model for everyone.',
			image:
				'https://images.unsplash.com/photo-1602146057681-08560aee8cde?q=80&w=640&auto=format&fit=crop',
			credit: 'Cherry Laithang on Unsplash'
		}
	];
</script>

<Item.Group class="grid w-full auto-rows-fr grid-cols-10 gap-2">
	<Item.Root variant="outline" class="aspect-5/7">
		<button class="cursor-pointer" onclick={addResource}>
			<Item.Content>
				<Item.Title>New</Item.Title>
				<Item.Description>Create a new Resource</Item.Description>
			</Item.Content>
		</button>
	</Item.Root>

	{#each resources as resource (resource.id)}
		<button
			class="h-full cursor-pointer"
			onclick={() => {
				openResource(resource.id);
			}}>
			<Item.Root variant="outline" class="5/7">
				<Item.Header>
					<img
						src="https://images.unsplash.com/photo-1610280777472-54133d004c8c?q=80&w=640&auto=format&fit=crop"
						alt={resource.name}
						width="128"
						height="128"
						class="aspect-square w-full rounded-sm object-cover" />
				</Item.Header>
				<Item.Content>
					<Item.Title>{resource.name}</Item.Title>
					<Item.Description>{resource.id}</Item.Description>
				</Item.Content>
			</Item.Root>
		</button>
	{/each}
</Item.Group>
