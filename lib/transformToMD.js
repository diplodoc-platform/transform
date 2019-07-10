'use strict';

const fs = require('fs');
const mkdirp = require('mkdirp');
const {dirname} = require('path');
const MarkdownIt = require('markdown-it');

const liquid = require('./liquid');
const {buildVars} = require('./vars');
const {resolveRelativePath, isLocalUrl, isFileExists} = require('./utils');

const R_LIQUID = /({%-?([\s\S]*?)-?%})|({{-?([\s\S]*?)-?}})/g;
const INCLUDE_REGEXP = /{%\s*include\s*(notitle)?\s*\[(.+?)]\((.+?)\)\s*%}/g;

function copy(path, destPath, relativePath) {
    const targetPath = resolveRelativePath(path, relativePath);

    if (!isFileExists(targetPath)) {
        return;
    }

    const targetDestPath = resolveRelativePath(destPath, relativePath);

    try {
        fs.copyFileSync(targetPath, targetDestPath);
    } catch (e) {
        mkdirp.sync(dirname(targetDestPath));
        fs.copyFileSync(targetPath, targetDestPath);
    }
}

module.exports = function transform(input, {vars = {}, varsPreset, path, root, destPath} = {}) {
    // find and copy includes
    let match;
    while ((match = INCLUDE_REGEXP.exec(input)) !== null) {
        const [,,, relativePath] = match;

        copy(path, destPath, relativePath);
    }

    // find and copy images
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

            copy(path, destPath, src);
        });
    });

    // liquid
    match = input.match(R_LIQUID);

    if (!match) {
        return input;
    }

    const builtVars = buildVars(vars, varsPreset, path, root);
    return liquid(input, builtVars);
};
