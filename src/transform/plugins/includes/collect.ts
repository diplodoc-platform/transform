import {bold} from 'chalk';

import {resolveRelativePath} from '../../utilsFS';
import {MarkdownItPluginOpts} from '../typings';

const includesPaths: string[] = [];

type Opts = MarkdownItPluginOpts & {
    destPath: string;
    copyFile(path: string, dest: string, opts: Opts): void;
};

const collect = (input: string, options: Opts) => {
    const {path, destPath = '', log, copyFile} = options;
    const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;

    let match;

    while ((match = INCLUDE_REGEXP.exec(input)) !== null) {
        let [, , , relativePath] = match;

        relativePath = relativePath.split('#')[0];

        const includePath = resolveRelativePath(path, relativePath);
        const targetDestPath = resolveRelativePath(destPath, relativePath);

        if (includesPaths.includes(includePath)) {
            log.error(`Circular includes: ${bold(includesPaths.concat(path).join(' ▶ '))}`);
            break;
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

    return null;
};

export = collect;
