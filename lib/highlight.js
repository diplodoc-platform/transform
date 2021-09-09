const mdUtils = require('markdown-it/lib/common/utils');

module.exports = function makeHighlight(langs = {}) {
    try {
        // eslint-disable-next-line global-require
        const hljs = require('highlight.js');

        Object.keys(langs).forEach((lang) => {
            hljs.registerLanguage(lang, langs[lang]);
        });

        return function highlight(str, lang) {
            let highlightedStr;
            const classNames = ['hljs'];

            if (lang && hljs.getLanguage(lang)) {
                classNames.push(lang);

                try {
                    highlightedStr = hljs.highlight(lang, str, true).value;
                } catch (_) {
                }
            }

            highlightedStr = highlightedStr || mdUtils.escapeHtml(str);

            return `<pre><code class="${classNames.join(' ')}">${highlightedStr}</code></pre>`;
        };
    } catch {
        return (str) => str;
    }
};
