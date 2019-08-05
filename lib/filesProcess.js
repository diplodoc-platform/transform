const path = require('path');
const fs = require('fs');
const glob = require('glob');
const mkdirp = require('mkdirp');
const yaml = require('js-yaml');

const transformToHTML = require('./index');
const transformToMD = require('./transformToMD');
const concat = require('./concat');
const styledHtml = require('./styledHtml');
const {fileInSources, writeFile, copyFile} = require('./utils');
const log = require('./log');

const cwd = process.env.INIT_CWD || process.cwd();
const INDEX_FILE = 'index.yaml';

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

function readDocumentConfig(document, {source, dest, outputFormat}) {
    let tocs;

    if (document) {
        const rootToc = yaml.safeLoad(fs.readFileSync(path.join(source, '_tocs', `${document}.yaml`), 'utf8'));

        tocs = rootToc.items.map(({toc}) => path.join(source, toc));
    } else {
        tocs = glob.sync('**/toc.yaml', {cwd: source, absolute: true});
    }

    if (!tocs) {
        return undefined;
    }

    return tocs.reduce((acc, item) => {
        const tocDir = path.dirname(item);
        const tocContent = fs.readFileSync(item, 'utf8');
        const toc = yaml.safeLoad(tocContent);

        if (outputFormat === 'md') {
            const destTocPath = item.replace(source, dest);
            writeFile(destTocPath, tocContent);
            copyFile(
                path.join(tocDir, INDEX_FILE),
                path.join(path.dirname(destTocPath), INDEX_FILE)
            );
        }

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
        sources = readDocumentConfig(document, {source, dest, outputFormat});
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

        if (!oneFile) {
            const {dir: fileDestDir} = path.parse(destPath);
            mkdirp.sync(fileDestDir);
        }

        const sourceFileContent = fs.readFileSync(sourcePath, 'utf8');

        log(`File: ${sourcePath}`);

        let destFileContent;
        const options = {
            path: sourcePath,
            root: source,
            vars,
            varsPreset
        };
        switch (outputFormat) {
            case 'html': {
                const {html, meta} = transformToHTML(sourceFileContent, {
                    ...options,
                    assetsPublicPath: '/',
                    oneFile
                });

                destFileContent = styles && !oneFile ? styledHtml(html, meta) : html;

                break;
            }
            case 'md': {
                destFileContent = transformToMD(sourceFileContent, {
                    ...options,
                    destPath
                });

                break;
            }
        }

        if (oneFile) {
            results[sourceFile] = destFileContent;
        } else {
            writeFile(destPath, destFileContent);
        }
    });

    log.all();

    if (!oneFile) {
        return;
    }

    const {content, meta} = concat(source, results, sources);
    writeFile(dest, styles ? styledHtml(content, meta) : content);
}

module.exports = filesProcess;
