const {relative} = require('path');
const {bold} = require('chalk');

const {resolveRelativePath} = require('../../utilsFS');

const includesPaths = [];

// eslint-disable-next-line consistent-return
const collect = (input, options) => {
    const {path, destPath, log, copyFile, singlePage, singlePageRoot} = options;
    const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;

    let match, result = input;

    while ((match = INCLUDE_REGEXP.exec(result)) !== null) {
        let [,,, relativePath] = match;
        const [matchedInclude] = match;

        relativePath = relativePath.split('#')[0];

        /* Description of paths in options:
        *  root - the path to the root folder for input files
        *  destRoot - the path to the root folder for the output files
        *  singlePageRoot - the path to the single page root folder based on destRoot
        *  path - the path to the file based on the "root" that is currently being processed
        *  destPath - the path to the file based on the "destRoot" that is currently being processed
        *  includePath - the absolute path to the included file based on "root"
        *  targetDestPath - the absolute path to the included file based on "destRoot"
        * */
        const includePath = resolveRelativePath(path, relativePath);

        /* destPath for single-page mode must be the same as for building the regular documentation */
        const targetDestPath = resolveRelativePath(destPath, relativePath);

        if (includesPaths.includes(includePath)) {
            log.error(`Circular includes: ${bold(includesPaths.concat(path).join(' ▶ '))}`);
            break;
        }

        /* A single-page file contains "{% includes %}" that link to the same files as for regular documentation,
        *  but we need to replace the links to make them relative from the single page file
        * */
        if (singlePage && !includesPaths.length) {
            const newRelativePath = relative(singlePageRoot, targetDestPath);
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
            /* Copying of the included file is performed the same way with the "single Page" flag and without it,
            *  so there is a double copying
            * */
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
};

module.exports = collect;
