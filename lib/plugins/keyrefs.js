'use strict';
const {parse, join, resolve} = require('path');
const {readFileSync} = require('fs');
const yaml = require('js-yaml');
const {bold} = require('chalk');
const log = require('../log');

const KEYS_FILENAME = 'keys.yaml';
const INLINE_RE = /^\[!KEYREF\s+(.+?)]/;
const FENCE_RE = /\[!KEYREF\s+(.+?)]/g;

const keysCache = {};

function readKeysFile(dir) {
    try {
        const file = join(dir, KEYS_FILENAME);
        return yaml.safeLoad(readFileSync(file, 'utf8')) || {};
    } catch (_) {
        return {};
    }
}

function getKeys(path, root) {
    const rootDir = root || parse(resolve('.')).root;
    const {dir: fileDir} = parse(path);

    if (keysCache[fileDir]) {
        return keysCache[fileDir];
    }

    let dir = fileDir;
    let keys = readKeysFile(dir);

    while (dir !== rootDir) {
        dir = parse(dir).dir;

        const parentKeys = readKeysFile(dir);
        keys = Object.assign(parentKeys, keys);
    }

    keysCache[fileDir] = keys;

    return keys;
}

function getKeyValue(keys, name, opts) {
    if (typeof keys[name] === 'undefined') {
        log.warn(`Key not found: ${bold(name)} in ${bold(opts.path)}`);
        return name;
    }

    return keys[name];
}

function keyrefs(md, opts) {
    md.inline.ruler.before('link', 'keyrefs', (state/* , silent */) => {
        const path = state.env.path || opts.path;
        const keys = getKeys(path, opts.root);
        const pos = state.pos;
        const max = state.posMax;
        let match;

        if (state.src.charCodeAt(state.pos) !== 0x5B/* [ */) {
            return false;
        }

        if (pos + 1 < max) {
            match = state.src.slice(pos).match(INLINE_RE);
            if (match) {
                const name = match[1];

                state.pending += getKeyValue(keys, name, opts);
                state.pos += match[0].length;
                return true;
            }
        }

        return false;
    });

    md.core.ruler.after('block', 'keyrefs', (state/* , silent */) => {
        const path = state.env.path || opts.path;
        const keys = getKeys(path, opts.root);
        const tokens = state.tokens;
        let i = 0;

        while (i < tokens.length) {
            const token = tokens[i];

            if (token.type === 'fence' || token.type === 'inline') {
                token.content = token.content.replace(FENCE_RE, (match, name) => {
                    return getKeyValue(keys, name, opts);
                });
            }

            i++;
        }
    });
}

module.exports = keyrefs;
