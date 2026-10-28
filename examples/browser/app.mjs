/* eslint-env browser */
import standard, {createHighlightJsHighlighter} from '@diplodoc/transform/browser';
import minimal from '@diplodoc/transform/browser/minimal';
import '@diplodoc/transform/runtime';
import '@diplodoc/transform/styles';

const source = document.querySelector('#source');
const result = document.querySelector('#result');
const status = document.querySelector('#status');
const composition = document.querySelector('#composition');
let highlighter;

/**
 * Render synchronously after any explicitly requested backend loading.
 * @returns {void} Nothing; the current document result is shown on the page.
 */
function render() {
    try {
        const transform = composition.value === 'minimal' ? minimal : standard;
        const output = transform(source.value, {highlighter, lang: 'en'});
        result.innerHTML = output.result.html;
        status.textContent = JSON.stringify({meta: output.result.meta, logs: output.logs}, null, 2);
    } catch (error) {
        status.textContent = error.message;
    }
}

source.value = `# Browser Markdown

{% note info %}

This page uses the public browser entry, shared CSS sanitizer and explicit runtime/styles imports.

{% endnote %}

{% cut "Details" %}

++Underline++, H~2~O and **bold** text.

{% endcut %}

{% list tabs %}

- First

  First tab content.

- Second

  Second tab content.

{% endlist %}

\`\`\`js
const answer = 42;
\`\`\`
`;
source.addEventListener('input', render);
composition.addEventListener('change', render);
document.querySelector('#highlight').addEventListener('click', async () => {
    const [module, language] = await Promise.all([
        import('highlight.js/lib/core'),
        import('highlight.js/lib/languages/javascript'),
    ]);
    highlighter = createHighlightJsHighlighter(module, {
        languages: {javascript: language.default},
        allowedLanguages: ['js', 'javascript'],
    });
    render();
});
render();
