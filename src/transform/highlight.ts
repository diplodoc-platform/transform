import type {HighlightLangMap} from './typings';

import {escapeHtml} from 'markdown-it/lib/common/utils';

export = function makeHighlight(langs: HighlightLangMap = {}) {
    try {
        // Important require.
        // Because we want to have a posibility to run in projects without hljs dependency
        const hljs = require('highlight.js');

        Object.keys(langs).forEach((lang) => {
            hljs.registerLanguage(lang, langs[lang]);
        });

        return function highlight(str: string, lang: string) {
            let highlightedStr;
            const classNames = ['hljs'];

            if (lang && hljs.getLanguage(lang)) {
                classNames.push(lang);

                try {
                    highlightedStr = hljs.highlight(str, {
                        language: lang,
                        ignoreIllegals: true,
                    }).value;
                } catch {}
            }

            highlightedStr = highlightedStr || escapeHtml(str);

            return `<pre><code class="${classNames.join(' ')}">${highlightedStr}</code></pre>`;
        };
    } catch {
        return (str: string) => escapeHtml(str);
    }
};
