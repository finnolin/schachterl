import adapter_static from '@sveltejs/adapter-static';
//import adapter_node from '@sveltejs/adapter-node';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	compilerOptions: { experimental: { async: true } },
	kit: {
		adapter: adapter_static({
			fallback: 'index.html'
		}),
		prerender: { entries: ['*'], handleHttpError: 'warn' },
		experimental: { remoteFunctions: true }
	}
};

export default config;
