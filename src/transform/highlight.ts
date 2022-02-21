import {escapeHtml} from 'markdown-it/lib/common/utils';
import hljs from 'highlight.js';
import {HighlightLangMap} from './typings';

export = function makeHighlight(langs: HighlightLangMap = {}) {
    try {
        Object.keys(langs).forEach((lang) => {
            hljs.registerLanguage(lang, langs[lang]);
        });

        return function highlight(str: string, lang: string) {
            let highlightedStr;
            const classNames = ['hljs'];

            if (lang && hljs.getLanguage(lang)) {
                classNames.push(lang);

                try {
                    highlightedStr = hljs.highlight(lang, str, true).value;
                } catch (_) {}
            }

            highlightedStr = highlightedStr || escapeHtml(str);

            return `<pre><code class="${classNames.join(' ')}">${highlightedStr}</code></pre>`;
        };
    } catch {
        return (str: string) => escapeHtml(str);
    }
};
