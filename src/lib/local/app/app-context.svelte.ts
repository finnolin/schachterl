import { local_db, DatabaseService } from '#lib/local/db/index.js';
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { v7 as uuid } from 'uuid';
import log from '#lib/logger.svelte.js';
import { eq } from 'drizzle-orm';
import { isTauri } from '@tauri-apps/api/core';
import * as schema from '#lib/local/db/schema.js';
import { relations } from '#lib/local/db/relations.js';
import { store } from '#lib/local/app/store.svelte.js';
import { auth } from '#lib/local/auth/auth.svelte.js';
import { PUBLIC_BASE_URL } from '$app/env/public';
import { tree } from '../utils/tree.svelte';
import { Spaces } from '../repositories/Spaces';
import { Resources } from '../repositories/Resources';
import { LiveQuery } from '../utils/live-query.svelte';
import type { Space, RelationshipType, ResourceType } from '#lib/local/db/schema.js';
import { notify } from '../utils/invalidation';
import { SvelteMap } from 'svelte/reactivity';

type SpaceWithTypes = Awaited<ReturnType<Spaces['getSpaceById']>>;
type Resource = Awaited<ReturnType<Resources['getResourceById']>>;

type Focus = {
	id: string;
	type: 'space' | 'resource';
};
export class AppContext {
	private Database: DatabaseService = local_db;
	drizzle_db: SqliteRemoteDatabase<typeof relations> | null = $state(null);
	private drizzle_schema = schema;

	// private space_cache = new SvelteMap<string, SpaceWithTypes>();
	// private resource_cache = new SvelteMap<string, Resource>();

	current_space: SpaceWithTypes | undefined = $state();
	spaces_query: LiveQuery<Space[]> | null = $state(null);
	resource_types_query: LiveQuery<ResourceType[]> | null = $state(null);

	loading_space: boolean = $state(false);

	focus: Focus | undefined = $state();
	focused_item: SpaceWithTypes | Resource | undefined = $state();

	is_tauri: boolean = $state(isTauri());

	async initialize() {
		log.app.debug('Initializing app context...');

		// * 1. Client ID
		log.app.debug('Checking client ID...');
		await store.getProperty('client_id');
		if (!store.client_id) {
			log.app.info('Creating new client_id...');
			const client_id = uuid();
			await store.setProperty('client_id', client_id);
		}
		await store.getOrCreateLocalUserId();

		// * 2. Set Server URL for web app
		if (!this.is_tauri) {
			log.app.debug('Webapp: Overwriting server_url...');
			await store.setProperty('server_url', PUBLIC_BASE_URL!);
		}

		// * 3. If no Server URL exits we can skip auth entirely and immediately initialize the local db
		if (store.server_url) {
			log.app.debug('Server URL set.');
			await this.connectServer();
		} else {
			log.app.debug('No Server URL set. Initialize Local DB with offline user...');
			await this.Database.initialize();
		}
		this.initQueries();
	}

	private initQueries() {
		this.spaces_query ??= new LiveQuery(['spaces'], () => new Spaces().getSpaces());
		notify('spaces'); // refetch now that db exists
		// this.resource_types_query ??= new
	}

	async setServer(server_url: string) {
		await store.setProperty('server_url', server_url);
		await this.connectServer();
	}

	async connectServer() {
		if (!store.server_url) return;
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
		await store.clearProperty('server_url');
	}

	async getAppMeta(property_name: string) {
		if (!this.drizzle_db) return;
		const [property] = await this.drizzle_db
			.select()
			.from(schema.app_meta)
			.where(eq(schema.app_meta.key, property_name));
		if (property && property.value) {
			return property.value;
		} else {
			return;
		}
	}

	async setAppMeta(property_key: string, property_value: string) {
		if (!this.drizzle_db) return;
		await this.deleteAppMeta(property_key);
		await this.drizzle_db
			.insert(schema.app_meta)
			.values({ key: property_key, value: property_value });
		log.app.info('Set Meta: ' + property_key + ' / ' + property_value);
	}

	async deleteAppMeta(property_key: string) {
		if (!this.drizzle_db) return;
		await this.drizzle_db.delete(schema.app_meta).where(eq(schema.app_meta.key, property_key));
	}

	setDb(db: SqliteRemoteDatabase<typeof relations>) {
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
		}
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
		this.focus = undefined;
		this.focused_item = undefined;
	}

	get space() {
		return this.current_space;
	}

	get focused() {
		if (!this.focus) return undefined;
		return this.focus;
	}
}

export const app_context = new AppContext();
