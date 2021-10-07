const {parse, resolve, join, sep} = require('path');
const {
    readFileSync,
    statSync,
} = require('fs');
const {bold} = require('chalk');
const MarkdownIt = require('markdown-it');

const log = require('./log');
const liquid = require('./liquid');

const filesCache = {};

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
    const {getVarsPerFile, vars, disableLiquid, disableLint, lintMarkdown} = options;
    let content;

    if (filesCache[path]) {
        content = filesCache[path];
    } else {
        content = readFileSync(path, 'utf8');

        const builtVars = getVarsPerFile ? getVarsPerFile(path) : vars;
        let sourceMap;

        if (!disableLiquid) {
            const liquidResult = liquid(content, builtVars, path, {withSourceMap: true});

            content = liquidResult.output;
            sourceMap = liquidResult.sourceMap;
        }

        if (!disableLint && lintMarkdown) {
            lintMarkdown({
                input: content,
                path,
                sourceMap,
            });
        }

        filesCache[path] = content;
    }

    const meta = state.md.meta;
    const tokens = state.md.parse(content, {...state.env, path});
    state.md.meta = meta;

    return tokens;
}

const getFullIncludePath = (includePath, root, path) => {
    let fullIncludePath;
    if (includePath.startsWith('/')) {
        fullIncludePath = join(root, includePath);
    } else {
        fullIncludePath = resolveRelativePath(path, includePath);
    }

    return fullIncludePath;
};

function getSinglePageAnchorId({root, currentPath, pathname, hash}) {
    let resultAnchor = currentPath;

    if (pathname) {
        resultAnchor = resolveRelativePath(currentPath, pathname);
    }

    resultAnchor = resultAnchor
        .replace(root, '')
        .replace(/\.(md|ya?ml|html)$/i, '')
        .replace(new RegExp(sep, 'gi'), '_');

    if (hash) {
        resultAnchor = resultAnchor + '_' + hash.slice(1);
    }

    return `#${resultAnchor}`;
}

const anchorsInFiles = {};
const saveAnchor = (path, id) => {
    anchorsInFiles[path] = anchorsInFiles[path] || {};

    if (anchorsInFiles[path]._processed) {
        return;
    }

    if (!anchorsInFiles[path]._processed && anchorsInFiles[path][id]) {
        log.error(`Anchor ${bold(id)} is duplicated in ${bold(path)}`);
    }

    anchorsInFiles[path][id] = true;
};

const setFileAsProcessedWithAnchors = (file) => {
    anchorsInFiles[file] = anchorsInFiles[file] || {};
    anchorsInFiles[file]._processed = true;

    return Boolean(anchorsInFiles[file]);
};

const isExistAnchor = ({file, id, root}) => {
    // There is anchor in cache
    if (anchorsInFiles[file] && anchorsInFiles[file][id]) {
        return true;
    }

    // File has been processed yet
    if (anchorsInFiles[file] && anchorsInFiles[file]._processed && !anchorsInFiles[file][id]) {
        return false;
    }

    const md = new MarkdownIt();
    const includes = require('./plugins/includes'); // eslint-disable-line global-require
    const anchors = require('./plugins/anchors'); // eslint-disable-line global-require
    [includes, anchors].forEach((plugin) => md.use(plugin, {path: file, root}));

    const content = readFileSync(file, 'utf8');
    md.parse(content, {path: file, root});

    return anchorsInFiles[file] && anchorsInFiles[file][id];
};

module.exports = {
    isFileExists,
    getFullIncludePath,
    resolveRelativePath,
    getFileTokens,
    getSinglePageAnchorId,
    saveAnchor,
    isExistAnchor,
    setFileAsProcessedWithAnchors,
};
