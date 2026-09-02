<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Card from '#lib/components/ui/card/index.js';
	import Button from '#lib/components/ui/button/button.svelte';
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
	<Card.Root>
		<Card.Header>
			<Card.Title>Resource types</Card.Title>
			<Card.Description>Define reusable types for resources across spaces.</Card.Description>
		</Card.Header>
		<Card.Footer>
			<Button href={resolve('/app/admin/resource-types')} variant="outline">Open</Button>
		</Card.Footer>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Users</Card.Title>
			<Card.Description>Inspect users synced in this app instance.</Card.Description>
		</Card.Header>
		<Card.Footer>
			<Button href={resolve('/app/admin/users')} variant="outline">Open</Button>
		</Card.Footer>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Server settings</Card.Title>
			<Card.Description>Configure backend connection and auth endpoint.</Card.Description>
		</Card.Header>
		<Card.Footer>
			<Button href={resolve('/settings/server')} variant="outline">Open</Button>
		</Card.Footer>
	</Card.Root>
</div>
