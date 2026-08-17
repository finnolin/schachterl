import adapter_static from '@sveltejs/adapter-static';

//import adapter_node from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import sqlocal from 'sqlocal/vite';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			// Consult https://svelte.dev/docs/kit/integrations
			// for more information about preprocessors
			preprocess: vitePreprocess(),
			compilerOptions: { experimental: { async: true } },
			adapter: adapter_static({ fallback: 'index.html' }),
			prerender: { entries: ['*'], handleHttpError: 'warn' },
			experimental: { remoteFunctions: true }
		}),
		sqlocal(),
		Icons({
			compiler: 'svelte'
		})
	]
});
