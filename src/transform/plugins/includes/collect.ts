import {relative} from 'path';
import {bold} from 'chalk';

import {getRelativePath, isFileExists, resolveRelativePath} from '../../utilsFS';

import {IncludeCollectOpts} from './types';

const includesPaths: string[] = [];

function processRecursive(
    includePath: string,
    targetDestPath: string,
    options: IncludeCollectOpts,
    appendix: Map<string, string>,
) {
    const {path, log, copyFile, includedParentPath: includedParentPathNullable, included} = options;
    const includedParentPath = includedParentPathNullable || path;

    const includeOptions = {
        ...options,
        path: includePath,
        destPath: targetDestPath,
    };

    try {
        const content = copyFile(includePath, targetDestPath, includeOptions);

        // To reduce file reading we can include the file content into the generated content
        if (included && content) {
            const includedRelativePath = getRelativePath(includedParentPath, includePath);

            // The appendix is the map that protects from multiple include files
            if (!appendix.has(includedRelativePath)) {
                // Recursive function to include the depth structure
                const includeContent = collectRecursive(
                    content,
                    {
                        ...options,
                        path: includePath,
                        includedParentPath,
                    },
                    appendix,
                );

                // Add to appendix set structure
                appendix.set(
                    includedRelativePath,
                    `{% included (${includedRelativePath}) %}\n${includeContent}\n{% endincluded %}`,
                );
            }
        }
    } catch (e) {
        log.error(`No such file or has no access to ${bold(includePath)} in ${bold(path)}`);
    }
}

function collectRecursive(
    result: string,
    options: IncludeCollectOpts,
    appendix: Map<string, string>,
) {
    const {root, path, destPath = '', log, singlePage} = options;

    const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;

    let match: RegExpExecArray | null;

    while ((match = INCLUDE_REGEXP.exec(result)) !== null) {
        let [, , , relativePath] = match;
        const [matchedInclude] = match;

        let includePath = resolveRelativePath(path, relativePath);
        const hashIndex = relativePath.lastIndexOf('#');
        if (hashIndex > -1 && !isFileExists(includePath)) {
            includePath = includePath.slice(0, includePath.lastIndexOf('#'));
            relativePath = relativePath.slice(0, hashIndex);
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

        processRecursive(includePath, targetDestPath, options, appendix);

        includesPaths.pop();
    }

    return result;
}

function collect(input: string, options: IncludeCollectOpts) {
    const appendix: Map<string, string> = new Map();

    input = collectRecursive(input, options, appendix);

    // Appendix should be appended to the end of the file (it supports depth structure, so the included files will have included as well)
    if (appendix.size > 0) {
        input += '\n' + [...appendix.values()].join('\n');
    }

    return input;
}

export = collect;
