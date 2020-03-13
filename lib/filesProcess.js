
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const mkdirp = require('mkdirp');
const yaml = require('js-yaml');
const {bold} = require('chalk');

const transformToHTML = require('./index');
const evalExp = require('./liquid/evaluation');
const transformToMD = require('./transformToMD');
const concat = require('./concat');
const styledHtml = require('./styledHtml');
const {fileInSources, writeFile, copyFile, isFileExists} = require('./utils');
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

const filterToc = (items, vars) => (
    items
        .filter(({when}) => (
            when === true || when === undefined || (typeof when === 'string' && evalExp(when, vars))
        ))
        .filter((el) => {
            if (el.items) {
                el.items = filterToc(el.items, vars);
            }
            // Если у элемента items пустой массив, не включаем его в toc
            return !(Array.isArray(el.items) && el.items.length === 0);
        })
);

function processingTocs(document, {source, dest, outputFormat, processToc, vars}) {
    let tocs;

    if (document) {
        const rootToc = yaml.safeLoad(fs.readFileSync(path.join(source, '_tocs', `${document}.yaml`), 'utf8'));

        tocs = rootToc.items.map(({toc}) => path.join(source, toc));
    } else {
        tocs = glob.sync('**/toc.yaml', {cwd: source, absolute: true});
    }

    // Если tocs --- пустой массив, возвращаем undefined
    if (Array.isArray(tocs) && !tocs.length) {
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
                path.join(path.dirname(destTocPath), INDEX_FILE),
            );
        }

        if (processToc) {
            const destTocPath = item.replace(source, dest);
            const toc = yaml.safeLoad(tocContent);
            toc.items = filterToc(toc.items, vars);
            const filteredTocContent = yaml.safeDump(toc);
            writeFile(destTocPath, filteredTocContent);
        }

        return acc.concat(walkItems(toc.items, tocDir));
    }, []);
}

function filesProcess({
    source: origSource, dest: origDest, vars, varsPreset, styles, outputFormat, oneFile, document, allowHtml,
    processToc, failOnErrors,
}) {
    let source = path.resolve(cwd, origSource);
    const dest = path.resolve(cwd, origDest);

    let files;
    const sourceStats = fs.statSync(source);
    if (sourceStats.isDirectory()) {
        files = glob.sync('**/*.md', {cwd: source});
    } else {
        const {dir, base} = path.parse(source);
        source = dir;

        files = glob.sync(base, {cwd: source});
    }

    const yfmConfig = path.join(source, '.yfm');
    if (isFileExists(yfmConfig)) {
        copyFile(yfmConfig, path.join(dest, '.yfm'));
    }

    let sources;
    try {
        sources = processingTocs(document, {source, dest, outputFormat, processToc, vars});
    } catch (e) {}
    const results = {};
    files.forEach((sourceFile) => {
        const destFile = path.format({
            ...path.parse(sourceFile),
            base: undefined,
            ext: `.${outputFormat}`,
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
            varsPreset,
        };
        switch (outputFormat) {
            case 'html': {
                const {html, meta, title} = transformToHTML(sourceFileContent, {
                    ...options,
                    allowHTML: allowHtml,
                    assetsPublicPath: '/',
                    oneFile,
                    needTitle: true,
                });

                if (!title) {
                    log.warn(`File without first level header: ${bold(sourcePath)}`);
                }

                destFileContent = styles && !oneFile ? styledHtml(html, meta) : html;

                break;
            }
            case 'md': {
                destFileContent = transformToMD(sourceFileContent, {
                    ...options,
                    destPath,
                    destRoot: dest,
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

    const numberOfErrors = log.hasErrors();
    if (failOnErrors && numberOfErrors) {
        // eslint-disable-next-line max-len
        throw new Error(`Flag fail-on-errors is enabled. Build failed with ${numberOfErrors} ${numberOfErrors === 1 ? 'error' : 'errors'}`);
    }

    if (!oneFile) {
        return;
    }

    const {content, meta} = concat(source, results, sources);
    writeFile(dest, styles ? styledHtml(content, meta) : content);
}

module.exports = filesProcess;
