const {bold} = require('chalk');
const MarkdownIt = require('markdown-it');
const meta = require('markdown-it-meta');
const deflist = require('markdown-it-deflist');
const attrs = require('markdown-it-attrs');
const imsize = require('markdown-it-imsize');

const includes = require('./plugins/includes');
const includeCode = require('./plugins/include-code').plugin;
const links = require('./plugins/links');
const images = require('./plugins/images');
const alerts = require('./plugins/alerts');
const anchors = require('./plugins/anchors');
const tabs = require('./plugins/tabs');
const code = require('./plugins/code');
const titles = require('./plugins/titles');
const cut = require('./plugins/cut');

const log = require('./log');
const highlight = require('./highlight');
const extractTitle = require('./title');
const getHeadings = require('./headings');
const liquid = require('./liquid');
const {buildVars} = require('./vars');

module.exports = function transform(originInput, opts = {}) {
    const {
        vars = {}, varsPreset, path, root, transformLink, assetsPublicPath, lang, plugins,
        extractTitle: extractTitleOption, needTitle, notFoundCb = () => {}, oneFile,
        allowHTML = false, linkify = true,
    } = opts;

    let md;

    const builtVars = buildVars(vars, varsPreset, path, root);
    const input = liquid(originInput, builtVars, path);

    if (plugins) {
        md = new MarkdownIt({html: allowHTML, highlight});

        plugins.forEach((plugin) => {
            let pluginModule = plugin;

            if (typeof plugin === 'string') {
                // eslint-disable-next-line global-require
                pluginModule = require(`./plugins/${plugin}`);
            }

            md.use(pluginModule, opts);
        });
    } else {
        md = new MarkdownIt({html: allowHTML, linkify, highlight})
            .use(attrs)
            .use(meta)
            .use(deflist)
            .use(includes, {path, notFoundCb, root, vars, varsPreset})
            .use(cut, {path})
            .use(includeCode, {path, notFoundCb, root})
            .use(links, {path, transformLink, oneFile, root, vars, varsPreset, notFoundCb})
            .use(images, {path, root, assetsPublicPath})
            .use(alerts, {lang, path})
            .use(anchors, {extractTitleOption, path})
            .use(tabs)
            .use(code)
            .use(titles)
            .use(imsize)
        ;
    }

    try {
        let title;
        let tokens;
        const env = {};

        tokens = md.parse(input, env);

        if (extractTitleOption) {
            ({title, tokens} = extractTitle(tokens));
        }
        if (needTitle) {
            ({title} = extractTitle(tokens));
        }

        const headings = getHeadings(tokens);
        const html = md.renderer.render(tokens, md.options, env);
        const assets = md.assets;
        const meta = md.meta;

        return {html, title, headings, assets, meta};
    } catch (err) {
        log.error(`Error occurred in ${bold(path)}`);
        throw err;
    }
};
