'use strict';
const {parse, join, resolve} = require('path');
const {readFileSync} = require('fs');
const yaml = require('js-yaml');

const KEYS_FILENAME = 'keys.yaml';
const KEYREF_REGEXP = /\[!KEYREF\s+(.+?)]/g;

const keysCache = {};

function readKeysFile(dir) {
    try {
        const file = join(dir, KEYS_FILENAME);
        return yaml.safeLoad(readFileSync(file, 'utf8')) || {};
    } catch (_) {
        return {};
    }
}

function getKeys(opts) {
    const rootDir = opts.root || parse(resolve('.')).root;
    const {dir: fileDir} = parse(opts.path);

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

function keyrefs(md, keys = {}) {
    md.inline.ruler2.push('keyrefs', (state) => {
        let i = 0;
        while (i < state.tokens.length) {
            const token = state.tokens[i];

            if (token.type === 'text' && token.content.match(KEYREF_REGEXP)) {
                token.content = token.content.replace(KEYREF_REGEXP, (match, name) => {
                    if (typeof keys[name] !== 'undefined') {
                        return keys[name];
                    } else {
                        return match;
                    }
                });
            }

            i++;
        }
    });
}

module.exports = {
    getKeys,
    keyrefs
};
