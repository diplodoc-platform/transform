import {htmlBlockDefaultSanitizer, transform as htmlExtension} from '@diplodoc/html-extension';
import '@diplodoc/html-extension/runtime';
import transform, {definePlugin} from '@diplodoc/transform/browser/minimal';
import sanitize, {defaultOptions} from '@diplodoc/transform/sanitize';

// The extension applies its block policy before generating the iframe.
const htmlBlock = definePlugin({
    id: 'example/html-block',
    setup(md) {
        md.use(
            htmlExtension({
                bundle: false,
                sandbox: 'allow-same-origin',
                sanitize: htmlBlockDefaultSanitizer,
                styles: {
                    body: {background: 'rgb(240, 240, 240)'},
                    'body.dark': {background: 'rgb(24, 24, 24)'},
                },
            }),
        );
    },
})({});

// Raw Markdown HTML is disabled. The installed extension produces the preview iframe.
const {result} = transform(
    [
        '# HTML extension preview',
        '',
        '<iframe srcdoc="Raw Markdown HTML"></iframe>',
        '',
        '::: html',
        '',
        `<p>${'Preview text that wraps in a narrower viewport. '.repeat(25).trim()}</p>`,
        '',
        ':::',
    ].join('\n'),
    {
        allowHTML: false,
        pluginConfiguration: {preset: 'none', plugins: [htmlBlock]},
        sanitize(html) {
            // The document policy preserves the attributes on that generated iframe.
            return sanitize(html, {
                ...defaultOptions,
                allowedAttributes: {
                    ...defaultOptions.allowedAttributes,
                    iframe: [
                        ...(defaultOptions.allowedAttributes.iframe ?? []),
                        'sandbox',
                        'srcdoc',
                        'data-yfm-sandbox-mode',
                    ],
                },
            });
        },
    },
);

document.querySelector('#preview').innerHTML = result.html;

const queue = window[Symbol.for('diplodocHtml')];
const controller = await new Promise((resolve) => queue.push(resolve));
await controller.initialize();

const theme = document.querySelector('#theme');
theme.addEventListener('change', () => {
    const classes = theme.value === 'dark' ? ['dark'] : [];
    return Promise.all(controller.blocks.map((block) => block.setRootClassNames(classes)));
});
theme.disabled = false;
