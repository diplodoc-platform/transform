

const fs = require('fs');
const MarkdownIt = require('markdown-it');
const {bold} = require('chalk');

const log = require('./log');
const liquid = require('./liquid');
const {buildVars} = require('./vars');
const {resolveRelativePath, isLocalUrl, copyFile, writeFile} = require('./utils');
const {getCodeTagMatch} = require('./plugins/include-code');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;

const includes = [];

function findImages(input, options) {
    const {path, destPath} = options;

    const md = new MarkdownIt();
    const tokens = md.parse(input, {});
    tokens.forEach((token) => {
        if (token.type !== 'inline') {
            return;
        }

        token.children.forEach((childToken) => {
            if (childToken.type !== 'image') {
                return;
            }

            const src = childToken.attrGet('src');

            if (!isLocalUrl(src)) {
                return;
            }

            const targetPath = resolveRelativePath(path, src);
            const targetDestPath = resolveRelativePath(destPath, src);
            copyFile(targetPath, targetDestPath);
        });
    });
}

function transformIncludes(input, options) {
    const {path, destPath} = options;

    const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;
    let match;
    while ((match = INCLUDE_REGEXP.exec(input)) !== null) {
        let [,,, relativePath] = match;

        relativePath = relativePath.split('#')[0];
        const includePath = resolveRelativePath(path, relativePath);
        const targetDestPath = resolveRelativePath(destPath, relativePath);

        if (includes.includes(includePath)) {
            log.error(`Circular includes: ${bold(includes.concat(path).join(' ▶ '))}`);
            process.exit(1);
        }

        includes.push(includePath);
        const includeOptions = {
            ...options,
            path: includePath,
            destPath: targetDestPath,
        };
        const sourceIncludeContent = fs.readFileSync(includePath, 'utf8');
        const destIncludeContent = transform(sourceIncludeContent, includeOptions);
        includes.pop();

        writeFile(targetDestPath, destIncludeContent);
    }
}

function copyIncludedSources(input, options) {
    const {path, destPath} = options;

    for (const line of input.split('\n')) {
        const match = getCodeTagMatch(line);
        if (match) {
            const {path: relativePath} = match.groups;

            const includePath = resolveRelativePath(path, relativePath);
            const targetDestPath = resolveRelativePath(destPath, relativePath);

            copyFile(includePath, targetDestPath);
        }
    }
}

function transform(input, options = {}) {
    const {vars = {}, varsPreset, path, root} = options;

    // liquid
    const match = input.match(R_LIQUID);

    if (!match) {
        return input;
    }

    const builtVars = buildVars(vars, varsPreset, path, root);
    const output = liquid(input, builtVars, path, {conditions: true});

    // find and copy includes
    transformIncludes(output, options);

    // find and copy included sources
    copyIncludedSources(output, options);

    // find and copy images
    findImages(output, options);

    return output;
}

module.exports = transform;
