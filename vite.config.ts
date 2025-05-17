import { defineConfig } from "vite";
import { dreamlandPlugin } from "vite-plugin-dreamland";
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig({
	plugins: [dreamlandPlugin(), createHtmlPlugin()],
	base: "./",
	server: {
		headers: {
			"Cross-Origin-Embedder-Policy": "require-corp",
			"Cross-Origin-Opener-Policy": "same-origin",
		},
		strictPort: true,
		port: 5001,
	},
	build: {
		target: "es2022",
	},
	resolve: {
		alias: {
			fs: "rollup-plugin-node-polyfills/polyfills/empty",
		},
	},
});
