<script lang="ts">
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { server_connection } from '#lib/local/sync/poke-client.svelte.js';
	import { auth } from '#lib/local/auth/auth.svelte.js';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import Separator from '#lib/components/ui/separator/separator.svelte';
	import { store } from '#lib/local/app/store.svelte.js';
	import { sync_client } from '#lib/local/sync/index.js';
	import Button from '#lib/components/ui/button/button.svelte';
	import { type HTMLBaseAttributes } from 'svelte/elements';

	let { class: class_name, ...rest_props }: WithElementRef<HTMLBaseAttributes> = $props();

	//Icons:
	import UserIcon from '~icons/tabler/user-circle';

	async function push() {
		await sync_client.push();
	}
	async function pull() {
		await sync_client.pull();
	}
</script>

<Popover.Root>
	<Popover.Trigger class={cn('fixed top-2 right-2 z-60 cursor-pointer', class_name)}>
		<div class="relative">
			<UserIcon class="size-6" />
			<!-- <Avatar.Root>
				 <Avatar.Image src="https://github.com/shadcn.png" alt="@shadcn" /> 
				
				<Avatar.Fallback>F</Avatar.Fallback>
			</Avatar.Root> -->

			<div
				class={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
					server_connection.connected ? 'bg-green-500' : 'bg-red-500'
				}`}>
			</div>
		</div>
	</Popover.Trigger>
	<Popover.Content class="m-2 w-80 flex flex-col">
		<div class="text-sm font-semibold">
			{#if auth.user}
				{auth.user.name}
			{/if}
		</div>
		<div class="text-xs">
			{#if auth.user}
				{auth.user.id}
			{/if}
		</div>
		{#if auth.session}
			<Button
				onclick={() => {
					auth.logout();
				}}>Logout</Button>
		{/if}
		<Separator />
		<div class="flex flex-row items-center justify-between">
			<div class="text-sm">
				{store.server_url}
			</div>
			<div class="flex flex-row items-center justify-end gap-1">
				<Button variant="outline" size="sm" onclick={push}>Push</Button>
				<Button variant="outline" size="sm" onclick={pull}>Pull</Button>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
