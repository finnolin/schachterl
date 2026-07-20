// invalidation.ts
type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
let pending = new Set<string>();
let flushScheduled = false;

export function subscribeToKeys(keys: string[], cb: Listener): () => void {
	for (const key of keys) {
		if (!listeners.has(key)) listeners.set(key, new Set());
		listeners.get(key)!.add(cb);
	}
	return () => {
		for (const key of keys) {
			const set = listeners.get(key);
			set?.delete(cb);
			if (set?.size === 0) listeners.delete(key);
		}
	};
}

export function notify(...keys: string[]) {
	for (const key of keys) pending.add(key);
	if (flushScheduled) return;
	flushScheduled = true;
	queueMicrotask(() => {
		const keys = pending;
		pending = new Set();
		flushScheduled = false;
		const fired = new Set<Listener>();
		for (const key of keys) {
			for (const cb of listeners.get(key) ?? []) {
				if (!fired.has(cb)) {
					fired.add(cb);
					cb();
				}
			}
		}
	});
}
