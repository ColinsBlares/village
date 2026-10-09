const webpack = require('webpack');
const config = require('../webpack.config');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const obfuscator = require('javascript-obfuscator');
const PATHS = require('./paths');

const srcRoot = path.resolve(__dirname, PATHS.basePath);
const outRoot = path.resolve(__dirname, PATHS.finalPath);
const buildRoot = path.resolve(__dirname, PATHS.buildPath);
const projectRoot = path.resolve(__dirname, '..');

const ignoreModules = ['attaches', 'game_resources', 'browser'];
const DEBOUNCE_MS = 300;

const debounceTimers = new Map();
const queue = [];
const queuedKeys = new Set();
let active = false;

function toPosix(relPath) {
    return relPath.split(path.sep).join('/');
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function toOut(srcAbs) {
    return path.join(outRoot, path.relative(srcRoot, srcAbs));
}

function shouldIgnore(relPath) {
    const base = path.basename(relPath);
    if (!base || base[0] === '.') return true;
    if (base.endsWith('~') || base.endsWith('.tmp') || base.endsWith('.swp')) return true;
    return false;
}

function isModuleDir(name) {
    if (!name || ignoreModules.includes(name)) return false;
    const dir = path.join(srcRoot, name);
    if (!fs.existsSync(dir)) return false;
    try {
        if (!fs.statSync(dir).isDirectory()) return false;
    } catch (err) {
        return false;
    }
    return fs.existsSync(path.join(dir, 'index.js'));
}

function isBrowserScript(normalized) {
    if (normalized === 'browser/index.js') return true;
    if (!normalized.startsWith('browser/js/') || !normalized.endsWith('.js')) return false;
    return normalized.indexOf('/', 'browser/js/'.length) === -1;
}

function logDone(fromPosix, outPosix, started) {
    console.log('[dev] ' + fromPosix + ' -> client_packages/' + outPosix + ' (' + (Date.now() - started) + 'ms)');
}

function copyOne(srcAbs) {
    const dest = toOut(srcAbs);
    ensureDir(path.dirname(dest));
    if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
    }
    fs.copyFileSync(srcAbs, dest);
}

function obfuscateOne(srcAbs) {
    const dest = toOut(srcAbs);
    ensureDir(path.dirname(dest));
    const result = obfuscator.obfuscate(fs.readFileSync(srcAbs, 'utf8').toString(), {
        compact: true,
        controlFlowFlattening: true
    });
    if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
    }
    fs.writeFileSync(dest, result.getObfuscatedCode());
}

function removeOutFile(relPath) {
    const dest = path.join(outRoot, relPath);
    if (!fs.existsSync(dest)) return false;
    if (!fs.statSync(dest).isFile()) return false;
    fs.unlinkSync(dest);
    return true;
}

function getModuleNames() {
    return fs.readdirSync(srcRoot);
}

function rewriteFile(dir, file, moduleNames) {
    const filePath = path.resolve(buildRoot, dir, file);
    let content = fs.readFileSync(filePath, 'utf8').toString();

    content = content.replace(new RegExp(dir + '/', 'g'), './');

    moduleNames.forEach(moduleName => {
        if (moduleName !== dir) {
            content = content.replace(`require('${moduleName}`, `require('../${moduleName}`);
        }
    });

    content = content.replace(/exports/g, 'module.exports');
    fs.writeFileSync(filePath, content);
}

function prepareModule(dir) {
    const from = path.join(srcRoot, dir);
    const to = path.join(buildRoot, dir);
    rimraf.sync(buildRoot);
    fs.mkdirSync(to, { recursive: true });

    fs.readdirSync(from).forEach(file => {
        const src = path.join(from, file);
        if (!fs.statSync(src).isFile()) return;
        fs.copyFileSync(src, path.join(to, file));
    });

    const moduleNames = getModuleNames();
    fs.readdirSync(to).forEach(file => {
        rewriteFile(dir, file, moduleNames);
    });
}

function buildModule(dir) {
    prepareModule(dir);

    const entry = {};
    entry[dir + '/index'] = './client_build/' + dir + '/index.js';

    const compiler = webpack({
        mode: 'production',
        context: projectRoot,
        entry: entry,
        output: config.output,
        module: config.module,
        devtool: false,
        performance: { hints: false },
        plugins: []
    });

    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            rimraf.sync(buildRoot);
            if (err) return reject(err);
            if (stats.hasErrors()) {
                const info = stats.toJson();
                return reject(new Error((info.errors || []).join('\n')));
            }
            resolve();
        });
    });
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
        if (isDir && !ignoreModules.includes(top) && !fs.existsSync(path.join(srcDir, 'index.js'))) {
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
    if (!stat.isFile()) return;

    const normalized = toPosix(relPath);
    const started = Date.now();
    const top = normalized.split('/')[0];

    if (normalized === 'index.js') {
        obfuscateOne(abs);
        logDone(normalized, 'index.js', started);
        return;
    }

    if (top === 'browser') {
        if (isBrowserScript(normalized)) {
            obfuscateOne(abs);
        } else {
            copyOne(abs);
        }
        logDone(normalized, normalized, started);
        return;
    }

    if (ignoreModules.includes(top)) {
        copyOne(abs);
        logDone(normalized, normalized, started);
        return;
    }

    if (isModuleDir(top)) {
        await buildModule(top);
        logDone(normalized, top + '/index.js', started);
        return;
    }

    copyOne(abs);
    logDone(normalized, normalized, started);
}

function jobKey(relPath) {
    const normalized = toPosix(relPath);
    const top = normalized.split('/')[0];
    if (top !== normalized && isModuleDir(top)) return 'module:' + top;
    return 'file:' + normalized;
}

function enqueue(key, task) {
    if (queuedKeys.has(key)) return;
    queuedKeys.add(key);
    queue.push({ key: key, task: task });
    pump();
}

function pump() {
    if (active) return;
    const item = queue.shift();
    if (!item) return;
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
    if (!filename) return;
    const relPath = path.normalize(filename);
    if (relPath.startsWith('..')) return;
    if (shouldIgnore(relPath)) return;

    const key = jobKey(relPath);
    const prev = debounceTimers.get(key);
    if (prev) clearTimeout(prev);

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

    ensureDir(outRoot);

    fs.watch(srcRoot, { recursive: true }, (eventType, filename) => {
        schedule(filename);
    });

    console.log('[dev] слежение за client_files');
    console.log('[dev] в client_packages попадает только сохранённый файл');
    console.log('[dev] модуль webpack пишется одним бандлом: client_packages/<модуль>/index.js');
}

start();
