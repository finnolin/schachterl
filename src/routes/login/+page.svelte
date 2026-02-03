<script lang="ts">
	import { app_context } from '$lib/local/app/app-context.svelte';
	import { store } from '$lib/local/app/store.svelte';
	import { getAuthClient } from '$lib/local/auth';
	const auth_client = getAuthClient();

	let server_url: string = $state('');
	if (store.server_url) {
		server_url = store.server_url;
	}

	let form_data = $state({
		email: '',
		password: '',
		name: ''
	});
	async function register() {
		const { data, error } = await auth_client.signUp.email(
			{
				email: form_data.email, // user email address
				password: form_data.password, // user password -> min 8 characters by default
				name: form_data.name // user display name
			},
			{
				onRequest: (ctx) => {
					console.log('requesting');
				},
				onSuccess: async (ctx) => {
					console.log('success');
					//const auth_token = ctx.response.headers.get('set-auth-token');
					//await app_context.validateSession(); // get the token from the response headers
					// // Store the token securely (e.g., in localStorage)
					// if (auth_token && app_context.is_tauri) {
					// 	console.log(auth_token);
					// 	localStorage.setItem('bearer_token', auth_token);
					// }

					//redirect to the dashboard or sign in page
				},
				onError: (ctx) => {
					// display the error message
					alert(ctx.error.message);
				}
			}
		);
	}
</script>

{#if app_context.is_tauri}
	{#if store.server_url}
		<div class="flex flex-col gap-2">
			Server Set: {store.server_url}
			<button
				class="cursor-pointer"
				onclick={() => {
					store.clearProperty('server_url');
				}}>
				Clear
			</button>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			<input
				type="text"
				id="server_address"
				name="server_address"
				placeholder="Enter you server address here"
				bind:value={server_url} />
			<button
				class="cursor-pointer"
				onclick={() => {
					app_context.setServer(server_url);
				}}>
				Set
			</button>
		</div>
	{/if}
{/if}

{#if !app_context.is_tauri || (app_context.is_tauri && store.server_url)}
	<div class="flex flex-col gap-1">
		<input class="border border-amber-600" bind:value={form_data.email} />
		<input class="border border-amber-600" bind:value={form_data.name} />
		<input class="border border-amber-600" bind:value={form_data.password} />
		<button
			class="cursor-pointer"
			onclick={() => {
				register();
			}}>
			Register
		</button>
	</div>
{/if}
