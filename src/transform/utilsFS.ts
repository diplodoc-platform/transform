import type {Dictionary} from 'lodash';

import {readFileSync, realpathSync, statSync} from 'fs';
import escapeRegExp from 'lodash/escapeRegExp';
import {join, parse, relative, resolve, sep} from 'path';
import QuickLRU from 'quick-lru';

import liquidSnippet from './liquid';
import {StateCore} from './typings';
import {defaultTransformLink} from './utils';

const filesCache = new QuickLRU<string, string>({maxSize: 1000});

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
    conditionsInCode?: boolean;
    content?: string;
};

export function getFileTokens(
    path: string,
    state: StateCore,
    options: GetFileTokensOpts,
    content?: string,
) {
    const {
        getVarsPerFile,
        vars,
        disableLiquid,
        disableLint,
        lintMarkdown,
        disableTitleRefSubstitution,
        disableCircularError,
        inheritVars = true,
        conditionsInCode,
    } = options;

    const builtVars = (getVarsPerFile && !inheritVars ? getVarsPerFile(path) : vars) || {};

    // Read the content only if we dont have one in the args
    if (!content) {
        if (filesCache.has(path)) {
            content = filesCache.get(path) as string;
        } else {
            content = readFileSync(path, 'utf8');
            filesCache.set(path, content);
        }
    }

    let sourceMap;

    if (!disableLiquid) {
        const liquidResult = liquidSnippet(content, builtVars, path, {
            withSourceMap: true,
            conditionsInCode,
        });

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
        .replace(new RegExp(escapeRegExp(sep), 'gi'), '_');

    if (hash) {
        resultAnchor = resultAnchor + '_' + hash.slice(1);
    }

    return `#${resultAnchor}`;
}

export function getPublicPath(
    {
        path,
        root,
        rootPublicPath,
        transformLink,
    }: {
        path?: string;
        root?: string;
        rootPublicPath?: string;
        transformLink?: (href: string) => string;
    },
    input?: string | null,
) {
    const currentPath = input || path || '';
    const filePath = relative(resolve(root || '', rootPublicPath || ''), currentPath);
    const transformer = transformLink || defaultTransformLink;
    const href = transformer(filePath);
    return href;
}

export function getRelativePath(path: string, toPath: string) {
    const pathDirs = path.split(sep);
    pathDirs.pop();
    const parentPath = pathDirs.join(sep);
    return relative(parentPath, toPath);
}

export function getRealPath(symlinkPath: string): string {
    try {
        return realpathSync(symlinkPath);
    } catch (err) {
        return symlinkPath;
    }
}
