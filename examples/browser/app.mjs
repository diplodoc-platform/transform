/* eslint-env browser */
import standard, {createHighlightJsHighlighter} from '@diplodoc/transform/portable';
import minimal from '@diplodoc/transform/portable/minimal';
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
        const showSource = composition.value === 'minimal';
        const transform = showSource ? minimal : standard;
        const output = transform(source.value, {highlighter, lang: 'en'});
        if (showSource) {
            const renderedSource = document.createElement('pre');
            renderedSource.textContent = output.result.html;
            result.replaceChildren(renderedSource);
        } else {
            result.innerHTML = output.result.html;
        }
        status.textContent = JSON.stringify({meta: output.result.meta, logs: output.logs}, null, 2);
    } catch (error) {
        status.textContent = error.message;
    }
}

source.value = `# Browser Markdown

{% note info %}

The standard composition uses the built-in sanitizer and explicit runtime and style imports.

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
