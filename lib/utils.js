'use strict';
const {parse, resolve, dirname} = require('path');
const {readFileSync, statSync, copyFileSync, writeFileSync} = require('fs');
const mkdirp = require('mkdirp');

const liquid = require('./liquid');
const log = require('./log');
const {buildVars} = require('./vars');

const filesCache = {};
const sourceFragmentsCache = {};

function isLocalUrl(url) {
    return !/^(?:[a-z]+:)?\/\//i.test(url);
}

function isFileExists(file) {
    try {
        const stats = statSync(file);

        return stats.isFile();
    } catch (e) {
        return false;
    }
}

function resolveRelativePath(fromPath, relativePath) {
    const {dir: fromDir} = parse(fromPath);
    return resolve(fromDir, relativePath);
}

function getFileTokens(path, state, options) {
    const {root, vars, varsPreset} = options;
    let content;

    if (filesCache[path]) {
        content = filesCache[path];
    } else {
        content = readFileSync(path, 'utf8');
        const builtVars = buildVars(vars, varsPreset, path, root);
        content = liquid(content, builtVars, path);
        filesCache[path] = content;
    }

    const meta = state.md.meta;
    const tokens = state.md.parse(content, {...state.env, path});
    state.md.meta = meta;

    return tokens;
}

const SOURCE_DELIMITER = '```';
function cutSourceFragment(source, lang, startMarker, endMarker) {
    let startLine = -1, endLine = -1;
    const lines = source.split('\n');

    lines.forEach((line, index) => {
        if (startLine < 0 && line.indexOf(startMarker) > -1) {
            startLine = index;
        }
        if (endLine < 0 && line.indexOf(endMarker) > -1) {
            endLine = index;
        }
    });

    if (startLine < 0) {
        log.warn(`Marker ${startMarker} not found, cutting source from the beginning.`);
        startLine = 0;
    }
    if (endLine < 0) {
        log.warn(`Marker ${endMarker} not found, cutting source till the end.`);
        endLine = lines.length;
    }
    if (endLine <= startLine) {
        log.warn(`End marker ${endMarker} occurred earlier than start marker ${startMarker}, fragment will be empty.`);
    }

    const sourceFragment = lines.slice(startLine + 1, endLine).join('\n');
    return `${SOURCE_DELIMITER}${lang}\n${sourceFragment}\n${SOURCE_DELIMITER}`;
}

function getSourceTokens(path, state, {lang, startMarker, endMarker}) {
    let sourceFragment;

    const sourceFragmentKey = `${path}:${startMarker}-${endMarker}`;
    if (sourceFragmentsCache[sourceFragmentKey]) {
        sourceFragment = sourceFragmentsCache[sourceFragmentKey];
    } else {
        let content;
        if (filesCache[path]) {
            content = filesCache[path];
        } else {
            content = readFileSync(path, 'utf8');
            filesCache[path] = content;
        }

        sourceFragment = cutSourceFragment(content, lang, startMarker, endMarker);
        sourceFragmentsCache[sourceFragmentKey] = sourceFragment;
    }

    const meta = state.md.meta;
    const tokens = state.md.parse(sourceFragment, {...state.env, path});
    state.md.meta = meta;

    return tokens;
}

function findBlockTokens(tokens, id) {
    let blockTokens = [];
    let i = 0, startToken, start, end;
    while (i < tokens.length) {
        const token = tokens[i];

        if (typeof start === 'number') {
            if (startToken.type === 'paragraph_open' && token.type === 'paragraph_close') {
                end = i + 1;
                break;
            } else if (startToken.type === 'heading_open') {
                if (token.type === 'heading_open' && token.tag === startToken.tag) {
                    end = i;
                    break;
                } else if (i === tokens.length - 1) {
                    end = tokens.length;
                }
            }
        }

        if (
            (token.type === 'paragraph_open' || token.type === 'heading_open') &&
            token.attrGet('id') === id &&
            typeof start === 'undefined'
        ) {
            startToken = token;
            start = i;
        }

        i++;
    }

    if (typeof start === 'number' && typeof end === 'number') {
        blockTokens = tokens.slice(start, end);
    }

    return blockTokens;
}

function headingInfo(tokens, idx) {
    const openToken = tokens[idx];
    const inlineToken = tokens[idx + 1];

    let lastTextToken, i = 0;
    while (i < inlineToken.children.length) {
        const token = inlineToken.children[i];

        if (token.type === 'text') {
            lastTextToken = token;
        }

        i++;
    }

    const level = Number.parseInt(openToken.tag.slice(1), 10);
    const title = lastTextToken && lastTextToken.content;

    return {
        level,
        title
    };
}

function fileInSources(sources, sourcePath) {
    return (
        sources.includes(sourcePath) ||
        sources.find((item) => sourcePath.startsWith(item))
    );
}

function copyFile(targetPath, targetDestPath) {
    if (!isFileExists(targetPath)) {
        return;
    }

    mkdirp.sync(dirname(targetDestPath));
    copyFileSync(targetPath, targetDestPath);
}

function writeFile(targetPath, content) {
    mkdirp.sync(dirname(targetPath));
    writeFileSync(targetPath, content, 'utf8');
}

module.exports = {
    isLocalUrl,
    isFileExists,
    resolveRelativePath,
    getFileTokens,
    getSourceTokens,
    findBlockTokens,
    headingInfo,
    fileInSources,
    copyFile,
    writeFile
};
