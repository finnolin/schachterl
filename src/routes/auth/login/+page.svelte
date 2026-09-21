<script lang="ts">
	import { goto } from '$app/navigation';
	import { app_context } from '#lib/local/app/app-context.svelte.js';
	import { store } from '#lib/local/app/store.svelte.js';
	import { auth } from '#lib/local/auth/auth.svelte.js';
	import { resolve } from '$app/paths';
	import Input from '#lib/components/ui/input/input.svelte';
	import Button from '#lib/components/ui/button/button.svelte';
	import Label from '#lib/components/ui/label/label.svelte';
	//import { getAuthClient } from '#lib/local/auth';
	//const auth_client = getAuthClient();
	console.log('login');
	let form_data = $state({
		email: '',
		password: ''
	});
	async function login() {
		if (!auth.client) return;
		const { data, error } = await auth.client.signIn.email(
			{
				email: form_data.email, // user email address
				password: form_data.password // user password -> min 8 characters by default
			},
			{
				// onRequest: (ctx) => {
				// 	console.log('requesting');
				// },
				onSuccess: async (ctx) => {
					console.log('success');
					//const auth_token = ctx.response.headers.get('set-auth-token');
					//await app_context.validateSession(); // get the token from the response headers
					// // Store the token securely (e.g., in localStorage)
					// if (auth_token && app_context.is_tauri) {
					//  console.log(auth_token);
					//  localStorage.setItem('bearer_token', auth_token);
					// }

					goto(resolve('/app'));
				},
				onError: (ctx) => {
					// display the error message
					alert(ctx.error.message);
				}
			}
		);
	}
</script>

{#if !app_context.is_tauri || (app_context.is_tauri && store.sync_connection)}
	<div class="flex w-full max-w-sm flex-col gap-4">
		<div class="flex flex-col gap-1.5">
			<Label for="email">Email</Label>
			<Input id="email" type="email" placeholder="Enter your email" bind:value={form_data.email} />
		</div>
		<div class="flex flex-col gap-1.5">
			<Label for="password">Password</Label>
			<Input
				id="password"
				type="password"
				placeholder="Enter your password"
				bind:value={form_data.password} />
		</div>
		<div class="flex flex-col gap-2">
			<Button
				onclick={() => {
					login();
				}}>
				Login
			</Button>
			<Button
				variant="outline"
				onclick={() => {
					goto(resolve('auth/register'));
				}}>Register</Button>
		</div>
	</div>
{/if}
