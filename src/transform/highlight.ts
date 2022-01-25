import {escapeHtml} from 'markdown-it/lib/common/utils';
import hljs, {LanguageFn} from 'highlight.js';

export type LangMap = Record<string, LanguageFn>;

export default function makeHighlight(langs: LangMap = {}) {
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
}
