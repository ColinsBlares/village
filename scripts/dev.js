const path = require('path');
const fs = require('fs');
const PATHS = require('./paths');
const files = require('./files');
const viteConfig = require('../vite.config');

const srcRoot = path.resolve(__dirname, PATHS.basePath);
const outRoot = path.resolve(__dirname, PATHS.finalPath);
const ignoreModules = viteConfig.IGNORE_MODULES;
const DEBOUNCE_MS = 300;

const debounceTimers = new Map();
const queue = [];
const queuedKeys = new Set();
let active = false;

function toPosix(relPath) {
    return relPath.split(path.sep).join('/');
}

function toOut(srcAbs) {
    return path.join(outRoot, path.relative(srcRoot, srcAbs));
}

function shouldIgnore(relPath) {
    const base = path.basename(relPath);
    if (!base || base[0] === '.') {
        return true;
    }
    if (base.endsWith('~') || base.endsWith('.tmp') || base.endsWith('.swp')) {
        return true;
    }
    return false;
}

function isModuleDir(name) {
    if (!name || ignoreModules.indexOf(name) !== -1) {
        return false;
    }
    const indexFile = path.join(srcRoot, name, 'index.js');
    return fs.existsSync(indexFile) && fs.statSync(indexFile).isFile();
}

function logDone(fromPosix, outPosix, started) {
    console.log('[dev] ' + fromPosix + ' -> client_packages/' + outPosix + ' (' + (Date.now() - started) + 'ms)');
}

function removeOutFile(relPath) {
    const dest = path.join(outRoot, relPath);
    if (!fs.existsSync(dest)) {
        return false;
    }
    if (!fs.statSync(dest).isFile()) {
        return false;
    }
    fs.unlinkSync(dest);
    return true;
}

function handleMissing(relPath) {
    const normalized = toPosix(relPath);
    const top = normalized.split('/')[0];
    const srcDir = path.join(srcRoot, top);

    if (top !== normalized && fs.existsSync(srcDir)) {
        let isDir = false;
        try {
            isDir = fs.statSync(srcDir).isDirectory();
        } catch (err) {
            isDir = false;
        }
        if (isDir && ignoreModules.indexOf(top) === -1 && !fs.existsSync(path.join(srcDir, 'index.js'))) {
            if (removeOutFile(top + '/index.js')) {
                console.log('[dev] удалён client_packages/' + top + '/index.js');
            }
            return;
        }
    }

    if (removeOutFile(relPath)) {
        console.log('[dev] удалён client_packages/' + normalized);
    }
}

async function processPath(relPath) {
    const abs = path.join(srcRoot, relPath);
    if (!fs.existsSync(abs)) {
        handleMissing(relPath);
        return;
    }

    let stat;
    try {
        stat = fs.statSync(abs);
    } catch (err) {
        return;
    }
    if (!stat.isFile()) {
        return;
    }

    const normalized = toPosix(relPath);
    const started = Date.now();
    const top = normalized.split('/')[0];

    if (normalized === 'index.js' || normalized === 'browser/index.js') {
        files.obfuscateFile(abs, toOut(abs));
        logDone(normalized, normalized, started);
        return;
    }

    if (ignoreModules.indexOf(top) !== -1) {
        files.copyFile(abs, toOut(abs));
        logDone(normalized, normalized, started);
        return;
    }

    if (isModuleDir(top)) {
        if (!normalized.endsWith('.js')) {
            files.copyFile(abs, toOut(abs));
            logDone(normalized, normalized, started);
            return;
        }
        await viteConfig.bundleModules([top]);
        logDone(normalized, top + '/index.js', started);
        return;
    }

    files.copyFile(abs, toOut(abs));
    logDone(normalized, normalized, started);
}

function jobKey(relPath) {
    const normalized = toPosix(relPath);
    const top = normalized.split('/')[0];
    if (top !== normalized && isModuleDir(top) && normalized.endsWith('.js')) {
        return 'module:' + top;
    }
    return 'file:' + normalized;
}

function enqueue(key, task) {
    if (queuedKeys.has(key)) {
        return;
    }
    queuedKeys.add(key);
    queue.push({ key: key, task: task });
    pump();
}

function pump() {
    if (active) {
        return;
    }
    const item = queue.shift();
    if (!item) {
        return;
    }
    queuedKeys.delete(item.key);
    active = true;
    Promise.resolve()
        .then(item.task)
        .catch(err => {
            console.error('[dev] ошибка:', err && err.stack ? err.stack : err);
        })
        .then(() => {
            active = false;
            pump();
        });
}

function schedule(filename) {
    if (!filename) {
        return;
    }
    const relPath = path.normalize(filename);
    if (relPath.startsWith('..')) {
        return;
    }
    if (shouldIgnore(relPath)) {
        return;
    }

    const key = jobKey(relPath);
    const prev = debounceTimers.get(key);
    if (prev) {
        clearTimeout(prev);
    }

    debounceTimers.set(key, setTimeout(() => {
        debounceTimers.delete(key);
        enqueue(key, () => processPath(relPath));
    }, DEBOUNCE_MS));
}

function start() {
    if (!fs.existsSync(srcRoot)) {
        console.error('[dev] не найдена папка client_files');
        process.exit(1);
    }

    files.ensureDir(outRoot);

    fs.watch(srcRoot, { recursive: true }, (eventType, filename) => {
        schedule(filename);
    });

    console.log('[dev] слежение за client_files');
    console.log('[dev] в client_packages попадает только сохранённый файл');
    console.log('[dev] модуль пишется одним бандлом: client_packages/<модуль>/index.js');
}

start();
