
const {parse, join, resolve} = require('path');
const {readFileSync} = require('fs');
const yaml = require('js-yaml');
const {bold} = require('chalk');
const log = require('./log');

const PRESETS_FILENAME = 'presets.yaml';
const presetsCache = {};

function readPresetsFile(dir) {
    const filePath = join(dir, PRESETS_FILENAME);
    let fileContent;

    try {
        fileContent = readFileSync(filePath, 'utf8');
    } catch (_) {
        return null;
    }

    try {
        return yaml.safeLoad(fileContent) || {};
    } catch (err) {
        log.error(`Unable to parse YAML: ${bold(filePath)}`);
        throw err;
    }
}

function getPresets(path, root) {
    const rootDir = root || parse(resolve('.')).root;
    const {dir: fileDir} = parse(path);

    if (presetsCache[fileDir]) {
        return presetsCache[fileDir];
    }

    let dir = fileDir;
    let presets = readPresetsFile(dir) || {};

    while (dir !== rootDir) {
        dir = parse(dir).dir;

        const parentPresets = readPresetsFile(dir);

        if (parentPresets) {
            presets = Object.keys(presets).reduce((acc, name) => {
                if (acc[name]) {
                    acc[name] = {
                        ...parentPresets[name],
                        ...presets[name],
                    };
                } else {
                    acc[name] = presets[name];
                }

                return acc;
            }, {...parentPresets});
        }
    }

    presetsCache[fileDir] = presets;

    return presets;
}

function buildVars(vars, varsPreset, path, root) {
    let result;

    if (varsPreset) {
        const presets = getPresets(path, root);
        const presetVars = presets[varsPreset];

        if (varsPreset === 'default') {
            result = {
                ...presetVars,
                ...vars,
            };
        } else {
            result = {
                ...presets['default'],
                ...presetVars,
                ...vars,
            };
        }
    }

    return result || vars;
}

module.exports = {
    buildVars,
};
