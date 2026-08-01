// src/lib/server/poke.ts
import type { Unsafe } from 'sveltekit-sse';
import log from '$lib/logger.svelte';

type Emit = (event: string, data: string) => Unsafe<void, Error>;

type Connection = {
	client_id: string;
	emit: Emit;
};

// user_id -> that user's live connections (one per device/tab)
const connections = new Map<string, Set<Connection>>();

export const pokeClients = {
	add(user_id: string, conn: Connection) {
		let set = connections.get(user_id);
		if (!set) {
			set = new Set();
			connections.set(user_id, set);
		}
		set.add(conn);
		return () => this.remove(user_id, conn);
	},

	remove(user_id: string, conn: Connection) {
		const set = connections.get(user_id);
		if (!set) return;
		set.delete(conn);
		if (set.size === 0) connections.delete(user_id);
	},

	/**
	 * Poke all of a user's connections except the one that originated the change.
	 * `except_client_id` is the client that just pushed — it already has the data.
	 */
	poke(user_id: string, except_client_id?: string) {
		const set = connections.get(user_id);
		if (!set) return;
		for (const conn of set) {
			if (conn.client_id === except_client_id) continue;
			const { error } = conn.emit('poke', String(Date.now()));
			if (error) this.remove(user_id, conn); // Error is truthy, false is not
		}
	},

	// in poke.ts
	pokeAll(except_client_id?: string) {
		const conns = [...connections.values()].flatMap((s) => [...s].map((c) => c.client_id));
		log.sync.debug('pokeAll', { conns, except: except_client_id });
		for (const [user_id, set] of connections) {
			for (const conn of set) {
				if (conn.client_id === except_client_id) continue;
				const { error } = conn.emit('poke', String(Date.now()));
				if (error) this.remove(user_id, conn);
			}
		}
	}
};
