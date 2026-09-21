import { createSubscriber } from 'svelte/reactivity';
import { subscribeToKeys } from './invalidation';

export class LiveQuery<T> {
	#value = $state<T | undefined>(undefined);
	#error = $state<unknown>(undefined);
	#loading = $state(true);
	#subscribe: () => void;
	#run: () => Promise<T>;

	constructor(keys: string[], run: () => Promise<T>) {
		this.#run = run;
		this.#subscribe = createSubscriber(() => {
			this.refetch();
			const unsub = subscribeToKeys([...keys, 'powersync'], () => this.refetch());
			return unsub; // cleanup when no effect reads this anymore
		});
	}

	async refetch() {
		try {
			this.#value = await this.#run();
			this.#error = undefined;
		} catch (e) {
			this.#error = e;
		} finally {
			this.#loading = false;
		}
	}

	get current() {
		this.#subscribe();
		return this.#value;
	}
	get loading() {
		this.#subscribe();
		return this.#loading;
	}
	get error() {
		this.#subscribe();
		return this.#error;
	}
}
