import {relative} from 'path';
import {bold} from 'chalk';

import {isFileExists, resolveRelativePath} from '../../utilsFS';
import {MarkdownItPluginOpts} from '../typings';
import {EnvApi} from '../../yfmlint';

const includesPaths: string[] = [];

type Opts = MarkdownItPluginOpts & {
    destPath: string;
    copyFile(path: string, dest: string, opts: Opts): void;
    singlePage: Boolean;
    envApi?: EnvApi;
};

const collect = (input: string, options: Opts) => {
    const {root, path, destPath = '', log, copyFile, singlePage, envApi} = options;
    const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;

    let match,
        result = input;

    while ((match = INCLUDE_REGEXP.exec(result)) !== null) {
        let [, , , relativePath] = match;
        const [matchedInclude] = match;

        let includePath = resolveRelativePath(path, relativePath);
        const hashIndex = relativePath.lastIndexOf('#');

        if (hashIndex > -1) {
            let includePathExists: boolean;
            if (envApi) {
                includePathExists = envApi.fileExists(relative(envApi.root, includePath));
            } else {
                includePathExists = isFileExists(includePath);
            }

            if (!includePathExists) {
                includePath = includePath.slice(0, includePath.lastIndexOf('#'));
                relativePath = relativePath.slice(0, hashIndex);
            }
        }

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
