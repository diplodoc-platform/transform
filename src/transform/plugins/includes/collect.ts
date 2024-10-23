import {relative} from 'path';
import {bold} from 'chalk';

import {getRelativePath, resolveRelativePath} from '../../utilsFS';
import {defaultFsContext} from '../../fsContext';

import {IncludeCollectOpts} from './types';

async function processRecursive(
    includePath: string,
    targetDestPath: string,
    options: IncludeCollectOpts,
) {
    const {
        path,
        log,
        copyFile,
        includedParentPath: includedParentPathNullable,
        included,
        fs,
    } = options;
    const includedParentPath = includedParentPathNullable || path;

    const includeOptions = {
        ...options,
        path: includePath,
        destPath: targetDestPath,
    };

    try {
        const contentProcessed = await copyFile(includePath, targetDestPath, includeOptions);

        // To reduce file reading we can include the file content into the generated content
        if (included) {
            const content = contentProcessed ?? (await fs?.readAsync(targetDestPath));

            if (content) {
                const includedRelativePath = getRelativePath(includedParentPath, includePath);

                // The appendix is the map that protects from multiple include files
                if (!options.appendix?.has(includedRelativePath)) {
                    // Recursive function to include the depth structure
                    const includeContent = await collectRecursive(content, {
                        ...options,
                        path: includePath,
                        includedParentPath,
                    });

                    // Add to appendix set structure
                    options.appendix?.set(
                        includedRelativePath,
                        `{% included (${includedRelativePath}) %}\n${includeContent}\n{% endincluded %}`,
                    );
                }
            }
        }
    } catch (e) {
        log.error(`No such file or has no access to ${bold(includePath)} in ${bold(path)}`);
    }
}

async function collectRecursive(result: string, options: IncludeCollectOpts) {
    const {root, path, destPath = '', log, singlePage, fs = defaultFsContext, deps} = options;

    const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;

    let match: RegExpExecArray | null;

    while ((match = INCLUDE_REGEXP.exec(result)) !== null) {
        let [, , , relativePath] = match;
        const [matchedInclude] = match;

        let includePath = resolveRelativePath(path, relativePath);
        const hashIndex = relativePath.lastIndexOf('#');

        deps?.markDep?.(path, includePath, 'include');

        if (hashIndex > -1 && !(await fs.existAsync(includePath))) {
            includePath = includePath.slice(0, includePath.lastIndexOf('#'));
            relativePath = relativePath.slice(0, hashIndex);
        }

        const targetDestPath = resolveRelativePath(destPath, relativePath);

        if (options.includesPaths?.includes(includePath)) {
            log.error(
                `Circular includes: ${bold(options.includesPaths?.concat(path).join(' ▶ '))}`,
            );
            break;
        }

        if (singlePage && !options.includesPaths?.length) {
            const newRelativePath = relative(root, includePath);
            const newInclude = matchedInclude.replace(relativePath, newRelativePath);

            result = result.replace(matchedInclude, newInclude);

            const delta = matchedInclude.length - newInclude.length;
            INCLUDE_REGEXP.lastIndex = INCLUDE_REGEXP.lastIndex - delta;
        }

        options.includesPaths?.push(includePath);

        await processRecursive(includePath, targetDestPath, options);

        options.includesPaths?.pop();
    }

    return result;
}

async function collect(input: string, options: IncludeCollectOpts) {
    const shouldWriteAppendix = !options.appendix;

    options.includesPaths = options.includesPaths ?? [];
    options.appendix = options.appendix ?? new Map();

    input = await collectRecursive(input, options);

    if (shouldWriteAppendix) {
        // Appendix should be appended to the end of the file (it supports depth structure, so the included files will have included as well)
        if (options.appendix.size > 0) {
            input += '\n' + [...options.appendix.values()].join('\n');
        }
    }

    return input;
}

export = collect;
