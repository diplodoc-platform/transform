const path = require('path');
const fs = require('fs');
const glob = require('glob');
const mkdirp = require('mkdirp');

const transformToHTML = require('./index');
const transformToMD = require('./transformToMD');
const concat = require('./concat');
const styledHtml = require('./styledHtml');
const log = require('./log');

const cwd = process.env.INIT_CWD || process.cwd();

function filesProcess({source, dest, vars, varsPreset, styles, outputFormat, oneFile}) {
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

    const results = {};
    files.forEach((sourceFile) => {
        const destFile = path.format({
            ...path.parse(sourceFile),
            base: undefined,
            ext: `.${outputFormat}`
        });
        const sourcePath = path.resolve(source, sourceFile);
        const destPath = path.resolve(dest, destFile);
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

    const {content, meta} = concat(source, results);
    fs.writeFileSync(dest, styles ? styledHtml(content, meta) : content, 'utf-8');
}

module.exports = filesProcess;
