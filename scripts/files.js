const fs = require('fs');
const path = require('path');
const obfuscator = require('javascript-obfuscator');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyFile(from, to) {
    ensureDir(path.dirname(to));
    if (fs.existsSync(to)) {
        fs.unlinkSync(to);
    }
    fs.copyFileSync(from, to);
}

function obfuscateFile(from, to) {
    const result = obfuscator.obfuscate(fs.readFileSync(from, 'utf8'), {
        compact: true,
        controlFlowFlattening: true,
    });
    ensureDir(path.dirname(to));
    if (fs.existsSync(to)) {
        fs.unlinkSync(to);
    }
    fs.writeFileSync(to, result.getObfuscatedCode());
}

function walkFiles(dir, onFile) {
    if (!fs.existsSync(dir)) {
        return;
    }

    fs.readdirSync(dir).forEach(name => {
        if (!name || name[0] === '.') {
            return;
        }
        const abs = path.join(dir, name);
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) {
            walkFiles(abs, onFile);
            return;
        }
        onFile(abs, stat);
    });
}

function needsUpdate(stat, dest, since) {
    if (!fs.existsSync(dest)) {
        return true;
    }
    return stat.mtime > since;
}

module.exports = {
    ensureDir: ensureDir,
    copyFile: copyFile,
    obfuscateFile: obfuscateFile,
    walkFiles: walkFiles,
    needsUpdate: needsUpdate,
};
