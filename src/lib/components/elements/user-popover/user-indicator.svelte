<script lang="ts">
	import * as Popover from '#lib/components/ui/popover/index.js';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { auth } from '#lib/local/auth/auth.svelte.js';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import Separator from '#lib/components/ui/separator/separator.svelte';
	import { store } from '#lib/local/app/store.svelte.js';
	import Button from '#lib/components/ui/button/button.svelte';
	import { type HTMLBaseAttributes } from 'svelte/elements';
	import { local_db, power_sync_db } from '#lib/local/db/index.js';

	let { class: class_name, ...rest_props }: WithElementRef<HTMLBaseAttributes> = $props();

	//Icons:
	import UserIcon from '~icons/tabler/user-circle';

	async function clearLocalDatabase() {
		if (!window.confirm('Clear the entire local database? This cannot be undone.')) return;

		await power_sync_db?.disconnectAndClear();
		await local_db.destroy();
		window.location.reload();
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
					auth.session ? 'bg-green-500' : 'bg-red-500'
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
				{auth.user.email}
			{/if}
		</div>
		<div class="text-xs">
			{#if auth.user}
				{auth.user.id}
			{/if}
		</div>
		<div class="text-xs">
			{#if local_db.db_string}
				{local_db.db_string}
			{/if}
		</div>
		<div class="flex flex-col gap-2">
			<Button href="/app/admin" variant="outline">Admin</Button>
			<Button variant="destructive" onclick={clearLocalDatabase}>Clear local database</Button>
			{#if auth.session || auth.user || store.remote_user_id}
				<Button
					onclick={() => {
						auth.logout();
					}}>{auth.session ? 'Logout' : 'Clear local session'}</Button>
			{/if}
		</div>
		<Separator />

		{#if auth.session}
			<div class="text-xs">Server: connected</div>
			<div class="text-sm">{store.sync_connection_target}</div>
		{:else}
			<div class="text-xs">Server: not connected</div>
			<Button href="/settings/server" variant="outline">Server Settings</Button>
		{/if}
	</Popover.Content>
</Popover.Root>
