const {parse, resolve, join} = require('path');
const {
    readFileSync,
    statSync,
} = require('fs');

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
    const {getVarsPerFile, vars} = options;
    let content;

    if (filesCache[path]) {
        content = filesCache[path];
    } else {
        content = readFileSync(path, 'utf8');
        const builtVars = getVarsPerFile ? getVarsPerFile(path) : vars;
        content = liquid(content, builtVars, path);
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
        .replace(new RegExp('/', 'gi'), '_');

    if (hash) {
        resultAnchor = resultAnchor + '_' + hash.slice(1);
    }

    return `#${resultAnchor}`;
}

module.exports = {
    isFileExists,
    getFullIncludePath,
    resolveRelativePath,
    getFileTokens,
    getSinglePageAnchorId,
};
