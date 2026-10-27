// Stable entry points and the finite inventory of previously shipped server modules.
// Add stable entries deliberately; a compatibility alias does not make a helper stable.
export const stableEntries = {
    '.': 'index',
    './parser': 'md',
    './types': 'typings',
    './plugins': 'plugins',
    './preprocessors': 'preprocessors/index',
    './frontmatter': 'frontmatter',
    './utils': 'utils',
    './utils/fs': 'utilsFS',
    './sanitize': 'sanitize',
    './log': 'log',
    './deprecation': 'deprecation',
    './plugins/anchors/collect': 'plugins/anchors/collect',
    './plugins/anchors': 'plugins/anchors/index',
    './plugins/block-anchor': 'plugins/block-anchor/index',
    './plugins/changelog/collect': 'plugins/changelog/collect',
    './plugins/changelog': 'plugins/changelog/index',
    './plugins/checkbox': 'plugins/checkbox/index',
    './plugins/code': 'plugins/code',
    './plugins/cut': 'plugins/cut',
    './plugins/deflist': 'plugins/deflist',
    './plugins/file': 'plugins/file/index',
    './plugins/images/collect': 'plugins/images/collect',
    './plugins/images': 'plugins/images/index',
    './plugins/imsize': 'plugins/imsize/index',
    './plugins/includes/collect': 'plugins/includes/collect',
    './plugins/includes': 'plugins/includes/index',
    './plugins/inline-code': 'plugins/inline-code/index',
    './plugins/inline-svg-marker': 'plugins/inline-svg-marker',
    './plugins/linkify-strikethrough': 'plugins/linkify-strikethrough',
    './plugins/links/collect': 'plugins/links/collect',
    './plugins/links': 'plugins/links/index',
    './plugins/meta': 'plugins/meta',
    './plugins/monospace': 'plugins/monospace',
    './plugins/notes': 'plugins/notes/index',
    './plugins/ol-attr-conversion': 'plugins/ol-attr-conversion',
    './plugins/sup': 'plugins/sup',
    './plugins/table': 'plugins/table/index',
    './plugins/tabs': 'plugins/tabs',
    './plugins/term': 'plugins/term/index',
    './plugins/video': 'plugins/video/index',
    './plugins/visibility': 'plugins/visibility',
    './plugins/utils': 'plugins/utils',
};

export const legacyModules = [
    {
        source: 'constants',
    },
    {
        source: 'deprecation',
    },
    {
        source: 'frontmatter',
    },
    {
        source: 'getObject',
        legacyDefault: true,
    },
    {
        source: 'headings',
        legacyDefault: true,
    },
    {
        source: 'highlight',
        legacyDefault: true,
    },
    {
        source: 'index',
        legacyDefault: true,
    },
    {
        source: 'liquid/conditions',
        legacyDefault: true,
    },
    {
        source: 'liquid/cycles',
        legacyDefault: true,
    },
    {
        source: 'liquid/errors',
    },
    {
        source: 'liquid/evaluation',
    },
    {
        source: 'liquid/filters',
    },
    {
        source: 'liquid/index',
    },
    {
        source: 'liquid/legacyConditions',
        legacyDefault: true,
    },
    {
        source: 'liquid/lexical',
    },
    {
        source: 'liquid/services/argv',
    },
    {
        source: 'liquid/sourceMap',
    },
    {
        source: 'liquid/substitutions',
        legacyDefault: true,
    },
    {
        source: 'liquid/utils',
    },
    {
        source: 'log',
    },
    {
        source: 'markdown-it-utils',
    },
    {
        source: 'md',
        legacyDefault: true,
    },
    {
        source: 'plugins/anchors/collect',
        legacyDefault: true,
    },
    {
        source: 'plugins/anchors/constants',
    },
    {
        source: 'plugins/anchors/custom-id',
    },
    {
        source: 'plugins/anchors/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/block-anchor/block-anchor',
    },
    {
        source: 'plugins/block-anchor/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/changelog/collect',
        legacyDefault: true,
    },
    {
        source: 'plugins/changelog/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/changelog/types',
    },
    {
        source: 'plugins/checkbox/checkbox',
    },
    {
        source: 'plugins/checkbox/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/code',
        legacyDefault: true,
    },
    {
        source: 'plugins/cut',
        legacyDefault: true,
    },
    {
        source: 'plugins/deflist',
        legacyDefault: true,
    },
    {
        source: 'plugins/file/const',
    },
    {
        source: 'plugins/file/file',
    },
    {
        source: 'plugins/file/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/images/collect',
        legacyDefault: true,
    },
    {
        source: 'plugins/images/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/imsize/const',
    },
    {
        source: 'plugins/imsize/helpers',
    },
    {
        source: 'plugins/imsize/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/imsize/plugin',
    },
    {
        source: 'plugins/includes/collect',
        legacyDefault: true,
    },
    {
        source: 'plugins/includes/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/includes/types',
    },
    {
        source: 'plugins/inline-code/constant',
    },
    {
        source: 'plugins/inline-code/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/inline-svg-marker',
        legacyDefault: true,
    },
    {
        source: 'plugins/linkify-strikethrough',
    },
    {
        source: 'plugins/links/collect',
        legacyDefault: true,
    },
    {
        source: 'plugins/links/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/meta',
        legacyDefault: true,
    },
    {
        source: 'plugins/monospace',
        legacyDefault: true,
    },
    {
        source: 'plugins/notes/constants',
    },
    {
        source: 'plugins/notes/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/ol-attr-conversion',
    },
    {
        source: 'plugins/sup',
        legacyDefault: true,
    },
    {
        source: 'plugins/table/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/table/types',
    },
    {
        source: 'plugins/tabs',
        legacyDefault: true,
    },
    {
        source: 'plugins/term/constants',
    },
    {
        source: 'plugins/term/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/term/termDefinitions',
    },
    {
        source: 'plugins/typings',
    },
    {
        source: 'plugins/utils',
    },
    {
        source: 'plugins/video/const',
    },
    {
        source: 'plugins/video/index',
        legacyDefault: true,
    },
    {
        source: 'plugins/video/parsers',
    },
    {
        source: 'plugins/video/types',
    },
    {
        source: 'plugins/video/utils',
    },
    {
        source: 'plugins/visibility',
    },
    {
        source: 'plugins',
        legacyDefault: true,
    },
    {
        source: 'preprocessors/included/index',
        legacyDefault: true,
    },
    {
        source: 'preprocessors/index',
    },
    {
        source: 'sanitize',
    },
    {
        source: 'svgo',
    },
    {
        source: 'title',
        legacyDefault: true,
    },
    {
        source: 'typings',
    },
    {
        source: 'utils',
    },
    {
        source: 'utilsFS',
    },
    {
        source: 'yfmlint/index',
        legacyDefault: true,
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/index',
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/yfm001',
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/yfm002',
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/yfm003',
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/yfm004',
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/yfm005',
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/yfm006',
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/yfm007',
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/yfm008',
    },
    {
        source: 'yfmlint/markdownlint-custom-rule/yfm009',
    },
    {
        source: 'yfmlint/typings',
    },
    {
        source: 'yfmlint/utils',
    },
    {
        source: 'yfmlint/yfmlint',
        legacyDefault: true,
    },
];

export const staticEntries = {
    './runtime': './dist/js/yfm.js',
    './runtime/base': './dist/js/base.js',
    './runtime/yfm-only': './dist/js/_yfm-only.js',
    './runtime/print': './dist/js/print.js',
    './styles': './dist/css/yfm.css',
    './styles/base': './dist/css/base.css',
    './styles/yfm-only': './dist/css/_yfm-only.css',
    './styles/print': './dist/css/print.css',
    './scss/*': './dist/scss/*',
    './dist/scss/*': './dist/scss/*',
    './src/*': './src/*',
    './package.json': './package.json',
};

for (const name of ['yfm', 'base', '_yfm-only', 'print']) {
    for (const [directory, extension] of [
        ['js', 'js'],
        ['css', 'css'],
    ]) {
        for (const suffix of name === 'print' ? [''] : ['', '.min']) {
            const path = `./dist/${directory}/${name}${suffix}`;
            staticEntries[path] = `${path}.${extension}`;
            staticEntries[`${path}.${extension}`] = `${path}.${extension}`;
            staticEntries[`${path}.${extension}.map`] = `${path}.${extension}.map`;
        }
    }
}
