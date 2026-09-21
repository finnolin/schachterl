import { local_db, DatabaseService } from '#lib/local/db/index.js';
import type { LocalDrizzleDb } from '#lib/local/db/index.js';
import log from '#lib/logger.svelte.js';
import { isTauri } from '@tauri-apps/api/core';
import * as schema from '#lib/local/db/schema.js';
import { store } from '#lib/local/app/store.svelte.js';
import { auth } from '#lib/local/auth/auth.svelte.js';
import { tree } from '#lib/components/features/tree/tree.svelte.js';
import { Spaces } from '../repositories/Spaces';
import { Resources } from '../repositories/Resources';
import { LiveQuery } from '../utils/live-query.svelte';
import type { Space, RelationshipType, ResourceType } from '#lib/local/db/schema.js';
import { notify } from '../utils/invalidation';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { sidebar } from '#lib/components/layout/sidebar/sidebar_state.svelte.js';
import { SvelteMap } from 'svelte/reactivity';

type SpaceWithTypes = Awaited<ReturnType<Spaces['getSpaceById']>>;
type Resource = Awaited<ReturnType<Resources['getResourceById']>>;

type Focus = {
	id: string;
	type: 'space' | 'resource';
};
export class AppContext {
	private Database: DatabaseService = local_db;
	drizzle_db: LocalDrizzleDb | null = $state(null);
	private drizzle_schema = schema;

	// private space_cache = new SvelteMap<string, SpaceWithTypes>();
	// private resource_cache = new SvelteMap<string, Resource>();

	current_space: SpaceWithTypes | undefined = $state();
	current_space_id: string | undefined = $state();
	spaces_query: LiveQuery<Space[]> | null = $state(null);
	resource_types_query: LiveQuery<ResourceType[]> | null = $state(null);

	// * Live (reactive) version of `current_space`.
	// Recreated whenever the focused space changes, refetched whenever one of
	// its invalidation keys is notified.
	space_query: LiveQuery<SpaceWithTypes> | null = $derived.by(() => {
		const space_id = this.current_space_id;
		if (!space_id) return null;
		return new LiveQuery(['spaces', 'resource_types', `space:${space_id}`], () =>
			new Spaces().getSpaceById(space_id)
		);
	});

	loading_space: boolean = $state(false);

	focus: Focus | undefined = $state();
	focused_item: SpaceWithTypes | Resource | undefined = $state();

	is_tauri: boolean = $state(isTauri());

	// * Boot progress, surfaced by the root layout / welcome page as a progress bar.
	boot_total_steps = 4;
	boot_step: number = $state(0);
	boot_label: string = $state('Starting...');

	private setBootStep(step: number, label: string) {
		this.boot_step = step;
		this.boot_label = label;
		log.app.info(`Boot step ${step}/${this.boot_total_steps}: ${label}`);
	}

	async initialize() {
		log.app.debug('Initializing app context...');
		this.setBootStep(0, 'Loading settings...');
		await store.initialize();

		this.setBootStep(1, 'Checking connection...');
		const sync_connection = store.sync_connection;
		if (!sync_connection) {
			goto(resolve('settings/server'));
			return;
		} else if (sync_connection.mode == 'local') {
			this.setBootStep(2, 'Setting up local user...');
			await store.ensureLocalUserId();

			this.setBootStep(3, 'Opening database...');
			await this.Database.initialize();
		} else if (sync_connection.mode == 'remote') {
			this.setBootStep(2, 'Connecting to server...');
			auth.createClient(sync_connection.endpoint);
			const cached_user = await store.getProperty('remote_user_id');
			if (!cached_user) {
				console.log('navigating to auth');
				goto(resolve('auth/login'));
				return;
			}

			this.setBootStep(3, 'Opening database...');
			await this.Database.initialize();
			await auth.validateSession();
		}
		//await sidebar.initialize();

		this.setBootStep(4, 'Ready.');
		this.initQueries();

		// e.g. returning from the server-selection page after choosing 'local'
		if (page.url.pathname === resolve('settings/server')) {
			goto(resolve('/'));
		}
		if (page.url.pathname === resolve('/')) {
			goto(resolve('/app'));
		}
	}

	private initQueries() {
		this.spaces_query ??= new LiveQuery(['spaces'], () => new Spaces().getSpaces());
		notify('spaces'); // refetch now that db exists
		// this.resource_types_query ??= new
	}

	async setServer(server_url: string) {
		await store.setProperty('sync_connection_target', server_url);
		await this.initialize();
	}

	async connectServer() {
		if (!store.sync_connection || store.sync_connection.mode == 'local') return;
		if (store.user_id) {
			log.app.debug('Local User ID found... initializing DB...');
			await this.Database.initialize();
		} else {
			log.app.debug('No User ID found... skipping DB init ...');
		}
		await auth.initialize();
	}

	async clearServer() {
		if (!isTauri()) return;
		await store.clearProperty('sync_connection_target');
		await store.clearProperty('server_url');
	}

	setDb(db: LocalDrizzleDb) {
		this.drizzle_db = db;
	}

	closeDb() {
		this.drizzle_db = null;
	}

	get db() {
		if (!this.drizzle_db) {
			throw new Error('Database not initialized. Call initialize() first.');
		}
		return this.drizzle_db;
	}

	get schema() {
		if (!this.drizzle_schema) {
			throw new Error('No schema found');
		}
		return this.drizzle_schema;
	}

	// async setSpace(space: Space) {
	// 	log.app.debug('Changing space to:', space.name, space.id);
	// 	await tree.load(space.id);
	// 	this.current_space = space;
	// }
	//

	async setSpace(space_id: string) {
		await this.setSpaceById(space_id);
		return this.current_space;
	}

	async setSpaceById(space_id: string) {
		if (tree.space_id !== space_id) {
			await tree.load(space_id);
			console.log('tree load');
		}
		this.current_space_id = space_id;
		const space = await new Spaces().getSpaceById(space_id);
		this.current_space = space;
	}

	async setFocus(focus: Focus) {
		this.loading_space = true;
		this.focus = focus;
		if (focus.type === 'space') {
			await this.setSpaceById(focus.id);
		} else {
			const resource = await new Resources().getResourceById(focus.id);
			if (resource) {
				await this.setSpaceById(resource.space_id);
			}
		}
		this.loading_space = false;
	}

	async clearFocus() {
		this.current_space = undefined;
		this.current_space_id = undefined;
		this.focus = undefined;
		this.focused_item = undefined;
	}

	get space() {
		return this.current_space;
	}

	// * Preferred read path in the UI: reactive, auto-refetching space.
	get live_space() {
		return this.space_query?.current;
	}

	get live_space_loading() {
		return this.space_query?.loading ?? false;
	}

	get live_space_error() {
		return this.space_query?.error;
	}

	get focused() {
		if (!this.focus) return undefined;
		return this.focus;
	}
}

export const app_context = new AppContext();
