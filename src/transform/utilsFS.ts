import _, {Dictionary} from 'lodash';
import {readFileSync, statSync} from 'fs';
import {createHash} from 'crypto';

import {parse, resolve, join, sep} from 'path';

import liquid from './liquid';
import {StateCore} from './typings';

const filesCache: Record<string, string> = {};

export function isFileExists(file: string) {
    try {
        const stats = statSync(file);

        return stats.isFile();
    } catch (e) {
        return false;
    }
}

export function resolveRelativePath(fromPath: string, relativePath: string) {
    const {dir: fromDir} = parse(fromPath);

    return resolve(fromDir, relativePath);
}

export type GetFileTokensOpts = {
    getVarsPerFile?: (path: string) => Record<string, string>;
    vars?: Record<string, unknown>;
    disableLiquid?: boolean;
    disableLint?: boolean;
    lintMarkdown?: (opts: {input: string; path: string; sourceMap?: Dictionary<string>}) => void;
    disableTitleRefSubstitution?: boolean;
    disableCircularError?: boolean;
    inheritVars?: boolean;
};

function getFileHash(path: string, vars: object) {
    let varsHash = '';
    try {
        const varsStr = JSON.stringify(vars);
        varsHash = createHash('sha256').update(varsStr).digest('hex');
    } catch {}

    return `${path}|${varsHash}`;
}

export function getFileTokens(path: string, state: StateCore, options: GetFileTokensOpts) {
    const {
        getVarsPerFile,
        vars,
        disableLiquid,
        disableLint,
        lintMarkdown,
        disableTitleRefSubstitution,
        disableCircularError,
        inheritVars = true,
    } = options;
    let content;

    const builtVars = (getVarsPerFile && !inheritVars ? getVarsPerFile(path) : vars) || {};
    const fileHash = getFileHash(path, builtVars);

    if (filesCache[fileHash]) {
        content = filesCache[fileHash];
    } else {
        content = readFileSync(path, 'utf8');

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

        filesCache[fileHash] = content;
    }

    const meta = state.md.meta;
    const tokens = state.md.parse(content, {
        ...state.env,
        path,
        disableTitleRefSubstitution,
        disableCircularError,
    });
    state.md.meta = meta;

    return tokens;
}

export const getFullIncludePath = (includePath: string, root: string, path: string) => {
    let fullIncludePath;
    if (includePath.startsWith(sep)) {
        fullIncludePath = join(root, includePath);
    } else {
        fullIncludePath = resolveRelativePath(path, includePath);
    }

    return fullIncludePath;
};

export function getSinglePageAnchorId(args: {
    root: string;
    currentPath: string;
    pathname?: string;
    hash?: string | null;
}) {
    const {root, currentPath, pathname, hash} = args;
    let resultAnchor = currentPath;

    if (pathname) {
        resultAnchor = resolveRelativePath(currentPath, pathname);
    }

    resultAnchor = resultAnchor
        .replace(root, '')
        .replace(/\.(md|ya?ml|html)$/i, '')
        .replace(new RegExp(_.escapeRegExp(sep), 'gi'), '_');

    if (hash) {
        resultAnchor = resultAnchor + '_' + hash.slice(1);
    }

    return `#${resultAnchor}`;
}
