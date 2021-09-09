const {relative} = require('path');
const {bold} = require('chalk');

const {resolveRelativePath} = require('../../utilsFS');

const includesPaths = [];

// eslint-disable-next-line consistent-return
const collect = (input, options) => {
    const {root, path, destPath = '', log, copyFile, singlePage} = options;
    const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;

    let match, result = input;

    while ((match = INCLUDE_REGEXP.exec(result)) !== null) {
        let [,,, relativePath] = match;
        const [matchedInclude] = match;

        relativePath = relativePath.split('#')[0];

        const includePath = resolveRelativePath(path, relativePath);
        const targetDestPath = resolveRelativePath(destPath, relativePath);

        if (includesPaths.includes(includePath)) {
            log.error(`Circular includes: ${bold(includesPaths.concat(path).join(' ▶ '))}`);
            break;
        }

        if (singlePage && !path.includes('_includes/')) {
            const newRelativePath = relative(root, includePath);
            const newInclude = matchedInclude.replace(relativePath, newRelativePath);

            result = result.replace(matchedInclude, newInclude);
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
};

module.exports = collect;
