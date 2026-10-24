const path = require('path');
const fs = require('fs');

const clientRoot = path.resolve(__dirname, 'client_files');
const packagesRoot = path.resolve(__dirname, 'client_packages');

const IGNORE_MODULES = ['attaches', 'game_resources', 'browser'];

function rageClientPlugin() {
    return {
        name: 'rage-client',
        enforce: 'pre',
        resolveId(source) {
            if (!source || source.startsWith('.') || source.startsWith('\0') || path.isAbsolute(source)) {
                return null;
            }

            const normalized = source.split('\\').join('/');
            const base = path.resolve(clientRoot, ...normalized.split('/'));

            if (fs.existsSync(base) && fs.statSync(base).isFile()) {
                return base;
            }
            if (fs.existsSync(base + '.js') && fs.statSync(base + '.js').isFile()) {
                return base + '.js';
            }

            const indexFile = path.join(base, 'index.js');
            if (fs.existsSync(indexFile)) {
                return indexFile;
            }

            return null;
        },
        transform(code, id) {
            const norm = id.split('\\').join('/');
            if (norm.indexOf('/client_files/') === -1 || !norm.endsWith('.js')) {
                return null;
            }

            const next = code
                .replace(/(^|[^\w.])exports\b/g, '$1module.exports')
                .replace(/^["']use strict["'];?[ \t]*\r?\n?/gm, '');

            if (next === code) {
                return null;
            }

            return { code: next, map: null };
        },
        renderChunk(code) {
            return code.replace(/^\s*var\s+[A-Za-z_$][\w$]*\s*=\s*/, '');
        },
    };
}

function createClientConfig(input) {
    return {
        configFile: false,
        root: __dirname,
        publicDir: false,
        clearScreen: false,
        logLevel: 'warn',
        appType: 'custom',
        plugins: [rageClientPlugin()],
        build: {
            outDir: packagesRoot,
            emptyOutDir: false,
            copyPublicDir: false,
            minify: true,
            target: 'es2017',
            sourcemap: false,
            cssCodeSplit: false,
            reportCompressedSize: false,
            modulePreload: false,
            chunkSizeWarningLimit: 10000,
            commonjsOptions: {
                include: [/client_files[\\/]/, /node_modules/],
                ignoreDynamicRequires: true,
            },
            rollupOptions: {
                input: input,
                treeshake: false,
                output: {
                    format: 'iife',
                    name: 'rageClient',
                    strict: false,
                    esModule: false,
                    extend: true,
                    inlineDynamicImports: true,
                    entryFileNames: '[name].js',
                    generatedCode: {
                        constBindings: false,
                        symbols: false,
                    },
                },
                onwarn(warning, warn) {
                    if (warning.code === 'EVAL' || warning.code === 'THIS_IS_UNDEFINED') {
                        return;
                    }
                    warn(warning);
                },
            },
        },
    };
}

function listModuleNames() {
    return fs.readdirSync(clientRoot).filter(name => {
        if (IGNORE_MODULES.indexOf(name) !== -1) {
            return false;
        }
        const indexFile = path.join(clientRoot, name, 'index.js');
        return fs.existsSync(indexFile) && fs.statSync(indexFile).isFile();
    });
}

let vitePromise;

function loadVite() {
    if (!vitePromise) {
        vitePromise = import('vite');
    }
    return vitePromise;
}

async function bundleModules(moduleNames) {
    if (!moduleNames.length) {
        return 0;
    }

    const vite = await loadVite();
    const started = Date.now();

    for (let i = 0; i < moduleNames.length; i++) {
        const name = moduleNames[i];
        const input = {};
        input[name + '/index'] = path.join(clientRoot, name, 'index.js');
        await vite.build(createClientConfig(input));
    }

    return Date.now() - started;
}

function cliGuard() {
    throw new Error('Сборка клиента: npm run build или npm run dev');
}

cliGuard.createClientConfig = createClientConfig;
cliGuard.bundleModules = bundleModules;
cliGuard.listModuleNames = listModuleNames;
cliGuard.IGNORE_MODULES = IGNORE_MODULES;
cliGuard.clientRoot = clientRoot;
cliGuard.packagesRoot = packagesRoot;

module.exports = cliGuard;
