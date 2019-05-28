const path = require('path');
const fs = require('fs');
const glob = require('glob');
const mkdirp = require('mkdirp');
const yaml = require('js-yaml');

const transformToHTML = require('./index');
const transformToMD = require('./transformToMD');
const concat = require('./concat');
const styledHtml = require('./styledHtml');
const {fileInSources} = require('./utils');
const log = require('./log');

const cwd = process.env.INIT_CWD || process.cwd();

function walkItems(items, source) {
    return items.reduce((acc, {href, items}) => {
        if (href) {
            acc.push(path.join(source, href));
        }

        if (items) {
            acc.push(...walkItems(items, source));
        }

        return acc;
    }, []);
}

function readDocumentConfig(document, source) {
    const rootToc = yaml.safeLoad(fs.readFileSync(path.join(source, '_tocs', `${document}.yaml`), 'utf8'));

    return rootToc.items.reduce((acc, item) => {
        const tocPath = path.join(source, item.toc);
        const tocDir = path.dirname(tocPath);
        const toc = yaml.safeLoad(fs.readFileSync(tocPath, 'utf8'));

        return acc.concat(walkItems(toc.items, tocDir));
    }, []);
}

function filesProcess({source, dest, vars, varsPreset, styles, outputFormat, oneFile, document}) {
    source = path.resolve(cwd, source);
    dest = path.resolve(cwd, dest);

    let files;
    const sourceStats = fs.statSync(source);
    if (sourceStats.isDirectory()) {
        files = glob.sync('**/*.md', {cwd: source});
    } else {
        const {dir, base} = path.parse(source);
        source = dir;

        files = glob.sync(base, {cwd: source});
    }

    let sources;
    if (document) {
        try {
            sources = readDocumentConfig(document, source);
        } catch (e) {
            document = undefined;
        }
    }

    const results = {};
    files.forEach((sourceFile) => {
        const destFile = path.format({
            ...path.parse(sourceFile),
            base: undefined,
            ext: `.${outputFormat}`
        });
        const sourcePath = path.resolve(source, sourceFile);
        const destPath = path.resolve(dest, destFile);

        if (document && !fileInSources(sources, sourcePath)) {
            return;
        }

        const sourceFileContent = fs.readFileSync(sourcePath, 'utf8');

        log(`File: ${sourcePath}`);

        let destFileContent;
        switch (outputFormat) {
            case 'html': {
                const {html, meta} = transformToHTML(sourceFileContent, {
                    path: sourcePath,
                    root: source,
                    assetsPublicPath: '/',
                    vars,
                    varsPreset,
                    oneFile
                });

                destFileContent = styles && !oneFile ? styledHtml(html, meta) : html;

                break;
            }
            case 'md': {
                destFileContent = transformToMD(sourceFileContent, {
                    path: sourcePath,
                    root: source,
                    vars,
                    varsPreset
                });

                break;
            }
        }

        if (oneFile) {
            results[sourceFile] = destFileContent;
        } else {
            const {dir: fileDestDir} = path.parse(destPath);
            mkdirp.sync(fileDestDir);
            fs.writeFileSync(destPath, destFileContent, 'utf8');
        }
    });

    if (!oneFile) {
        return;
    }

    const {content, meta} = concat(source, results, sources);
    fs.writeFileSync(dest, styles ? styledHtml(content, meta) : content, 'utf-8');
}

module.exports = filesProcess;
