const {readFileSync} = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const glob = require('glob');

const getName = (fileName) => fileName.replace(new RegExp(path.sep, 'gi'), '_');

const getTocPath = (dir) => path.join(dir, 'toc.yaml');

function readToC(dir) {
    try {
        return yaml.safeLoad(readFileSync(getTocPath(dir), 'utf8'));
    } catch (_) {
        return {};
    }
}

function walkItems(items, files, dirName) {
    return items.reduce((acc, item) => {
        if (item.href) {
            const href = dirName ? path.join(dirName, item.href) : item.href;

            return `${acc}\n\n<a name='${getName(href)}'/>${files[href]}`;
        }

        if (item.items) {
            return acc + walkItems(item.items, files, dirName);
        }

        return acc;
    }, '');
}

function concat(source, files, sources, dirName) {
    const toc = readToC(source);
    let content = '';
    const tocIsEmpty = Object.keys(toc).length === 0;

    if (tocIsEmpty) {
        glob
            .sync('*/', {cwd: source})
            .filter((dir) => dir[0] !== '_')
            .forEach((dir) => {
                const newDirName = dirName ? path.join(dirName, dir) : dir;
                content += concat(path.join(source, dir), files, sources, newDirName).content;
            });
    } else {
        content += `<h1>${toc.title}</h1>`;
        content += walkItems(toc.items, files, dirName);
    }

    return {
        content,
        meta: tocIsEmpty ? {} : {
            title: toc.title,
            description: toc.description,
        },
    };
}

module.exports = concat;
