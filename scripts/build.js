const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const PATHS = require('./paths');
const files = require('./files');
const viteConfig = require('../vite.config');

const srcRoot = path.resolve(__dirname, PATHS.basePath);
const outRoot = path.resolve(__dirname, PATHS.finalPath);
const ignoreModules = viteConfig.IGNORE_MODULES;

function toOut(abs) {
    return path.join(outRoot, path.relative(srcRoot, abs));
}

function syncTree(fromDir, since, skipFile) {
    files.walkFiles(fromDir, (abs, stat) => {
        const rel = path.relative(fromDir, abs);
        if (skipFile && skipFile(rel)) {
            return;
        }
        const dest = toOut(abs);
        if (!files.needsUpdate(stat, dest, since)) {
            return;
        }
        files.copyFile(abs, dest);
    });
}

function syncObfuscated(from, to, since) {
    if (!fs.existsSync(from)) {
        return false;
    }
    const stat = fs.statSync(from);
    if (!files.needsUpdate(stat, to, since)) {
        return false;
    }
    files.obfuscateFile(from, to);
    return true;
}

function deleteUnused(currentPath) {
    fs.readdirSync(currentPath).forEach(item => {
        const updatePath = path.resolve(currentPath, item);
        const baseCurrentPath = updatePath.replace('client_packages', 'client_files');

        if (fs.existsSync(baseCurrentPath)) {
            if (fs.statSync(updatePath).isDirectory()) {
                deleteUnused(updatePath);
            }
            return;
        }

        if (item !== '.listcache') {
            rimraf.sync(updatePath);
        }
    });
}

function readSince() {
    if (!fs.existsSync(outRoot)) {
        fs.mkdirSync(outRoot, { recursive: true });
        return new Date(0);
    }

    const cacheFile = path.join(outRoot, '.listcache');
    if (!fs.existsSync(cacheFile)) {
        console.log('.listcache не найден, перезапустите сервер');
        return null;
    }

    return fs.statSync(cacheFile).mtime;
}

function collectModules(since) {
    const modules = [];

    fs.readdirSync(srcRoot).forEach(name => {
        if (!name || name[0] === '.' || ignoreModules.indexOf(name) !== -1) {
            return;
        }

        const dir = path.join(srcRoot, name);
        if (!fs.statSync(dir).isDirectory()) {
            return;
        }

        const indexFile = path.join(dir, 'index.js');
        if (!fs.existsSync(indexFile)) {
            syncTree(dir, since);
            return;
        }

        const outIndex = path.join(outRoot, name, 'index.js');
        let rebuild = !fs.existsSync(outIndex);
        if (!rebuild) {
            const head = fs.readFileSync(outIndex, 'utf8').slice(0, 12);
            if (head.indexOf('!function') === 0) rebuild = true;
        }

        files.walkFiles(dir, (abs, stat) => {
            if (abs.endsWith('.js')) {
                if (stat.mtime > since) {
                    rebuild = true;
                }
                return;
            }
            const dest = toOut(abs);
            if (files.needsUpdate(stat, dest, since)) {
                files.copyFile(abs, dest);
            }
        });

        if (rebuild) {
            modules.push(name);
        }
    });

    return modules;
}

async function main() {
    if (!fs.existsSync(srcRoot)) {
        console.error('не найдена папка client_files');
        process.exit(1);
    }

    const since = readSince();
    if (!since) {
        return;
    }

    const buildDir = path.resolve(__dirname, '../client_build');
    if (fs.existsSync(buildDir)) {
        rimraf.sync(buildDir);
    }

    ignoreModules.forEach(name => {
        const from = path.join(srcRoot, name);
        if (!fs.existsSync(from)) {
            return;
        }
        syncTree(from, since, rel => {
            return name === 'browser' && rel === 'index.js';
        });
    });

    const browserIndex = syncObfuscated(
        path.join(srcRoot, 'browser', 'index.js'),
        path.join(outRoot, 'browser', 'index.js'),
        since
    );
    const rootIndex = syncObfuscated(
        path.join(srcRoot, 'index.js'),
        path.join(outRoot, 'index.js'),
        since
    );

    fs.readdirSync(srcRoot).forEach(name => {
        const abs = path.join(srcRoot, name);
        if (name[0] === '.' || name === 'index.js' || !fs.statSync(abs).isFile()) {
            return;
        }
        const dest = path.join(outRoot, name);
        const stat = fs.statSync(abs);
        if (files.needsUpdate(stat, dest, since)) {
            files.copyFile(abs, dest);
        }
    });

    const modules = collectModules(since);
    if (modules.length) {
        const ms = await viteConfig.bundleModules(modules);
        console.log('[vite] модулей: ' + modules.length + ' за ' + ms + 'ms');
    } else if (!browserIndex && !rootIndex) {
        console.log('[vite] клиентские файлы не менялись');
    }

    deleteUnused(outRoot);
    console.log('[vite] готово');
}

main().catch(err => {
    console.error('[vite] ошибка:', err && err.stack ? err.stack : err);
    process.exit(1);
});
