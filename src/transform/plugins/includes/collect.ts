import {relative} from 'path';
import {bold} from 'chalk';

import {resolveRelativePath} from '../../utilsFS';
import {MarkdownItPluginOpts} from '../typings';

const includesPaths: string[] = [];

type Opts = MarkdownItPluginOpts & {
    destPath: string;
    copyFile(path: string, dest: string, opts: Opts): void;
    singlePage: Boolean;
};

const collect = (input: string, options: Opts) => {
    const {root, path, destPath = '', log, copyFile, singlePage} = options;
    const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;

    let match,
        result = input;

    while ((match = INCLUDE_REGEXP.exec(result)) !== null) {
        let [, , , relativePath] = match;
        const [matchedInclude] = match;

        relativePath = relativePath.split('#')[0];

        const includePath = resolveRelativePath(path, relativePath);
        const targetDestPath = resolveRelativePath(destPath, relativePath);

        if (includesPaths.includes(includePath)) {
            log.error(`Circular includes: ${bold(includesPaths.concat(path).join(' ▶ '))}`);
            break;
        }

        if (singlePage && !includesPaths.length) {
            const newRelativePath = relative(root, includePath);
            const newInclude = matchedInclude.replace(relativePath, newRelativePath);

            result = result.replace(matchedInclude, newInclude);

            const delta = matchedInclude.length - newInclude.length;
            INCLUDE_REGEXP.lastIndex = INCLUDE_REGEXP.lastIndex - delta;
        }

        includesPaths.push(includePath);
        const includeOptions = {
            ...options,
            path: includePath,
            destPath: targetDestPath,
        };

        try {
            copyFile(includePath, targetDestPath, includeOptions);
        } catch (e) {
            log.error(`No such file or has no access to ${bold(includePath)} in ${bold(path)}`);
        } finally {
            includesPaths.pop();
        }
    }

    if (singlePage) {
        return result;
    }

    return null;
};

export = collect;
