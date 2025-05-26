import { defineConfig } from "vite";
import { dreamlandPlugin } from "vite-plugin-dreamland";
import { createHtmlPlugin } from "vite-plugin-html";
import { writeFileSync } from "fs";
import { execSync } from "child_process";

export default defineConfig({
	plugins: [
		dreamlandPlugin(),
		createHtmlPlugin(),
		{
			name: "write-git-commit",
			closeBundle() {
				const commit = execSync("git rev-parse HEAD").toString().trim();
				writeFileSync("dist/MILESTONE", commit);
			},
		},
	],
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
		rollupOptions: {
			output: {
				entryFileNames: `assets/[name].js`,
				chunkFileNames: `assets/[name].js`,
				assetFileNames: `assets/[name].[ext]`,
			},
		},
	},
	resolve: {
		alias: {
			fs: "rollup-plugin-node-polyfills/polyfills/empty",
		},
	},
});
