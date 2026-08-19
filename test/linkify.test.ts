import type {MarkdownIt} from '../src/transform/typings';

import transform from '../src/transform';

describe('Linkify', () => {
    const url = 'https://example.com/path';
    const renderedLink = `<a href="${url}">${url}</a>`;
    const fencedCode = (fence: string, info = '', content = `~~${url}~~`) =>
        `${fence}${info}\n${content}\n${fence}`;

    it('should not linkify .cloud tld without linkifyTlds option', () => {
        const {
            result: {html},
        } = transform('yandex.cloud');

        expect(html).toMatchSnapshot();
    });
    it('should linkify .cloud tld with linkifyTlds option', () => {
        const {
            result: {html},
        } = transform('yandex.cloud', {linkifyTlds: 'cloud', linkify: true});

        expect(html).toMatchSnapshot();
    });

    it('should linkify a strikethrough URL without consuming its closing marker', () => {
        const {
            result: {html},
        } = transform(`~~${url}~~`, {linkify: true});

        expect(html).toBe(`<p><s>${renderedLink}</s></p>\n`);
    });

    it.each([
        ['**', 'strong'],
        ['*', 'em'],
        ['__', 'strong'],
        ['_', 'em'],
    ])('should preserve strikethrough inside %s emphasis', (markup, tag) => {
        const {
            result: {html},
        } = transform(`${markup}~~${url}~~${markup}`, {linkify: true});

        expect(html).toBe(`<p><${tag}><s>${renderedLink}</s></${tag}></p>\n`);
    });

    it.each([
        ['__', 'strong'],
        ['_', 'em'],
    ])('should preserve %s emphasis inside strikethrough', (markup, tag) => {
        const {
            result: {html},
        } = transform(`~~${markup}${url}${markup}~~`, {linkify: true});

        expect(html).toBe(`<p><s><${tag}>${renderedLink}</${tag}></s></p>\n`);
    });

    it.each(['.', ',', ';', '!', '?', "'"])(
        'should keep trailing punctuation %s outside the auto-linked URL',
        (punctuation) => {
            const {
                result: {html},
            } = transform(`~~${url}${punctuation}~~`, {linkify: true});

            expect(html).toBe(`<p><s>${renderedLink}${punctuation}</s></p>\n`);
        },
    );

    it.each([
        {
            name: 'inline code',
            source: `\`~~${url}~~\``,
            expectedFragments: ['<code'],
        },
        {
            name: 'three-backtick fence',
            source: fencedCode('```'),
            expectedFragments: ['<pre><code'],
        },
        {
            name: 'four-backtick fence containing three backticks',
            source: fencedCode('````', '', `\`\`\`\n~~${url}~~\n\`\`\``),
            expectedFragments: ['<pre><code'],
        },
        {
            name: 'three-tilde fence',
            source: fencedCode('~~~'),
            expectedFragments: ['<pre><code'],
        },
        {
            name: 'four-tilde fence containing three tildes',
            source: fencedCode('~~~~', '', `~~~\n~~${url}~~\n~~~`),
            expectedFragments: ['<pre><code'],
        },
        {
            name: 'four-space indented block',
            source: `    ~~${url}~~`,
            expectedFragments: ['<pre><code'],
        },
        {
            name: 'tab-indented block',
            source: `\t~~${url}~~`,
            expectedFragments: ['<pre><code'],
        },
        {
            name: 'fence with a language',
            source: fencedCode('```', 'text'),
            expectedFragments: ['class="hljs text"'],
        },
        {
            name: 'four-backtick fence with line numbers',
            source: fencedCode('````', 'text showLineNumbers'),
            expectedFragments: ['yfm-line-number'],
        },
        {
            name: 'tilde fence with line wrapping',
            source: fencedCode('~~~', 'text wrap'),
            expectedFragments: ['class="hljs text wrap"', 'g-button_selected'],
        },
        {
            name: 'four-tilde fence with a prompt',
            source: fencedCode('~~~~', 'text prompt="$"', `$ ~~${url}~~`),
            expectedFragments: ['data-prompt="$"', 'yfm-code-prompt'],
        },
        {
            name: 'fence with all supported parameters',
            source: fencedCode('```', 'text prompt="$" showLineNumbers wrap', `$ ~~${url}~~`),
            expectedFragments: [
                'data-prompt="$"',
                'yfm-code-prompt',
                'yfm-line-number',
                'class="hljs text wrap"',
                'g-button_selected',
            ],
        },
    ])('should not linkify a strikethrough URL in $name', ({source, expectedFragments}) => {
        const {
            result: {html},
        } = transform(source, {linkify: true, codeLineWrapping: true});

        expect(html).toContain(`~~${url}~~`);
        expect(html).not.toContain('<a ');
        expectedFragments.forEach((fragment) => expect(html).toContain(fragment));
    });

    it('should preserve a trailing tilde in a strikethrough URL', () => {
        const {
            result: {html},
        } = transform('~~https://example.com/~user~~~', {linkify: true});

        expect(html).toBe(
            '<p><s><a href="https://example.com/~user~">https://example.com/~user~</a></s></p>\n',
        );
    });

    it('should preserve trailing tildes outside strikethrough', () => {
        const {
            result: {html},
        } = transform('https://example.com/path~~', {linkify: true});

        expect(html).toBe(
            '<p><a href="https://example.com/path~~">https://example.com/path~~</a></p>\n',
        );
    });

    it('should ignore closed strikethrough before a URL with trailing tildes', () => {
        const {
            result: {html},
        } = transform('~~done~~ https://example.com/path~~', {linkify: true});

        expect(html).toBe(
            '<p><s>done</s> <a href="https://example.com/path~~">https://example.com/path~~</a></p>\n',
        );
    });

    it('should track strikethrough delimiters across multiple URLs', () => {
        const {
            result: {html},
        } = transform(
            '~~https://example.com/one~~ ~~https://example.com/two~~ https://example.com/three~~',
            {linkify: true},
        );

        expect(html).toBe(
            '<p><s><a href="https://example.com/one">https://example.com/one</a></s> ' +
                '<s><a href="https://example.com/two">https://example.com/two</a></s> ' +
                '<a href="https://example.com/three~~">https://example.com/three~~</a></p>\n',
        );
    });

    it('should respect the disabled linkify rule', () => {
        const {
            result: {html},
        } = transform('~~https://example.com/path~~', {
            linkify: true,
            disableRules: ['linkify'],
        });

        expect(html).toBe('<p><s>https://example.com/path</s></p>\n');
    });

    it('should allow a custom plugin to disable the replaced linkify rule', () => {
        const disableLinkify = (md: MarkdownIt) => md.disable('linkify');
        const {
            result: {html},
        } = transform('~~https://example.com/path~~', {
            linkify: true,
            plugins: [disableLinkify],
        });

        expect(html).toBe('<p><s>https://example.com/path</s></p>\n');
    });
});
