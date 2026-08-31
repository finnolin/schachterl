import { store } from '#lib/local/app/store.svelte.js';

class SidebarState {
	is_collapsed = $state(false);
	private toggle_callback: (() => void) | null = null;
	private sidebar_keyboard_shortcut = 'b';
	sidebar_size: number = $state(store.sidebar_size || 20);
	sidebar_collapsed: boolean = $state(false);
	initialized = $state(false);

	async initialize() {
		await this.getLayout();
		this.initialized = true;
	}

	// Event handler to apply to the `<svelte:window>`
	handleShortcutKeydown = (e: KeyboardEvent) => {
		if (e.key === this.sidebar_keyboard_shortcut && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			this.toggle();
		}
	};

	register(callback: () => void) {
		this.toggle_callback = callback;
	}

	toggle() {
		this.toggle_callback?.();
	}

	collapse() {
		if (!this.is_collapsed) this.toggle_callback?.();
	}

	expand() {
		if (this.is_collapsed) this.toggle_callback?.();
	}

	setSidebarSize(size: number) {
		this.sidebar_size = size;
	}

	async saveLayout() {
		// Never persist collapsed size; keep last expanded width.
		if (this.sidebar_size <= 0) return;
		await store.setProperty('sidebar_size', this.sidebar_size);
	}
	async getLayout() {
		const size = await store.getProperty('sidebar_size');
		// const collapsed = await store.getProperty('sidebar_collapsed');
		if (size !== undefined && size !== null) {
			this.sidebar_size = Number(size);
		}
	}
	get size() {
		return this.sidebar_size;
	}
}

export const sidebar = new SidebarState();
