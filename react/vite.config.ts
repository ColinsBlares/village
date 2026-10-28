import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const srcDir = path.resolve(__dirname, 'src');

function manualChunks(id: string) {
	const norm = id.replace(/\\/g, '/');

	if (norm.indexOf('node_modules') !== -1) {
		return 'vendor';
	}

	if (norm.endsWith('/src/index.tsx')) {
		return;
	}

	if (/\/interfaces\/bank\/(store|pagesStore)\.ts$/.test(norm)) {
		return 'shared';
	}

	if (/\/interfaces\/phone\/phoneState\.ts$/.test(norm)) {
		return 'shared';
	}

	if (/\/src\/interfaces\/[^/]+\/index\.ts$/.test(norm)) {
		return 'shared';
	}

	const iface = norm.match(/\/src\/interfaces\/([^/]+)\//);

	if (
		iface &&
		(iface[1] === 'selectMenu' || iface[1] === 'interactionMenu') &&
		norm.indexOf('/components/') === -1 &&
		!norm.endsWith('/runtime.ts')
	) {
		return 'shared';
	}

	if (iface && iface[1] !== 'visibility') {
		return iface[1];
	}

	if (norm.indexOf('/src/') !== -1) {
		return 'shared';
	}
}

function assetFileNames(assetInfo: { name?: string }) {
	const name = assetInfo.name || 'asset';

	if (name.slice(-4) === '.css') {
		return 'css/styles.css';
	}

	if (/\.(png|jpe?g|gif|svg|webp)$/.test(name)) {
		return 'img/[name].[hash][extname]';
	}

	if (/\.(ttf|otf|woff2?|eot)$/.test(name)) {
		return 'fonts/[name].[hash][extname]';
	}

	return 'assets/[name].[hash][extname]';
}

const browserDir = path.resolve(__dirname, '../client_files/browser');

function cleanBrowserDir(): Plugin {
	return {
		name: 'clean-browser-dir',
		apply: 'build',
		buildStart: function () {
			if (!fs.existsSync(browserDir)) {
				return;
			}

			fs.readdirSync(browserDir).forEach(function (name) {
				if (name === 'index.js') {
					return;
				}

				fs.rmSync(path.join(browserDir, name), {
					recursive: true,
					force: true,
				});
			});
		},
	};
}

export default defineConfig(function (env) {
	return {
		base: env.command === 'build' ? './' : '/',
		publicDir: path.resolve(__dirname, 'public'),
		plugins: [
			cleanBrowserDir(),
			react({
				jsxRuntime: 'classic',
			}),
		],
		resolve: {
			alias: [
				{ find: '@imgs', replacement: path.resolve(srcDir, 'assets/imgs') },
				{ find: '@fonts', replacement: path.resolve(srcDir, 'assets/fonts') },
				{ find: '@styles', replacement: path.resolve(srcDir, 'assets/styles') },
				{ find: '@utils', replacement: path.resolve(srcDir, 'utils') },
				{ find: '@', replacement: srcDir },
			],
		},
		esbuild: {
			jsx: 'transform',
		},
		build: {
			outDir: browserDir,
			emptyOutDir: false,
			cssCodeSplit: false,
			modulePreload: false,
			assetsInlineLimit: 0,
			rollupOptions: {
				input: path.resolve(__dirname, 'index.html'),
				output: {
					format: 'es',
					entryFileNames: 'js/index.js',
					chunkFileNames: 'js/[name].js',
					assetFileNames: assetFileNames,
					manualChunks: manualChunks,
				},
			},
		},
	};
});
