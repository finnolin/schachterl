import { app_context } from '$lib/local/app/app-context.svelte';

class SidebarState {
	is_collapsed = $state(false);
	private toggle_callback: (() => void) | null = null;
	private sidebar_keyboard_shortcut = 'b';
	private sidebar_size: number = 0;

	async initialize() {
		await this.getLayout();
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

	saveLayout() {
		app_context.setProperty('sidebar_size', this.sidebar_size);
	}
	async getLayout() {
		const size = await app_context.getProperty('sidebar_size');
		if (size) {
			this.sidebar_size = Number(size);
		}
	}
	get size() {
		return this.sidebar_size;
	}
}

export const sidebar = new SidebarState();
