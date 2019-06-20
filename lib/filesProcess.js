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
    let tocs;

    if (document) {
        const rootToc = yaml.safeLoad(fs.readFileSync(path.join(source, '_tocs', `${document}.yaml`), 'utf8'));

        tocs = rootToc.items.map(({toc}) => path.join(source, toc));
    } else {
        tocs = glob.sync('**/toc.yaml', {cwd: source, absolute: true});
    }

    if (!tocs) {
        return;
    }

    return tocs.reduce((acc, item) => {
        const tocDir = path.dirname(item);
        const toc = yaml.safeLoad(fs.readFileSync(item, 'utf8'));

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
    try {
        sources = readDocumentConfig(document, source);
    } catch (e) {}

    const results = {};
    files.forEach((sourceFile) => {
        const destFile = path.format({
            ...path.parse(sourceFile),
            base: undefined,
            ext: `.${outputFormat}`
        });
        const sourcePath = path.resolve(source, sourceFile);
        const destPath = path.resolve(dest, destFile);

        if (sources && !fileInSources(sources, sourcePath)) {
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
