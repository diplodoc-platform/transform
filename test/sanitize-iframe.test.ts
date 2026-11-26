import type {SanitizeOptions} from '../src/transform/sanitize';

import {load} from 'cheerio';

import transform from '../src/transform';
import portable from '../src/transform/browser/standard';
import {defaultOptions, sanitize} from '../src/transform/sanitize';

const escape = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
const iframe = (content: string, attrs = 'sandbox="allow-same-origin"') =>
    `<iframe data-yfm-sandbox-mode="srcdoc" ${attrs} srcdoc="${escape(content)}"></iframe>`;
const documentFor = (html: string) => load(load(html)('iframe').attr('srcdoc') || '');
const iframeTransforms = {
    'per-tag name': {div: 'iframe'},
    'per-tag function': {div: (_tagName, attribs) => ({tagName: 'iframe', attribs})},
    wildcard: {
        '*': (tagName, attribs) => ({tagName: tagName === 'div' ? 'iframe' : tagName, attribs}),
    },
} satisfies Record<string, NonNullable<SanitizeOptions['transformTags']>>;

describe.each(Object.entries(iframeTransforms))('iframe created by %s', (_name, transformTags) => {
    const input = iframe('<p id="marker">Visible</p>')
        .replace(/^<iframe/, '<div')
        .replace(/<\/iframe>$/, '</div>');

    it('rejects srcdoc if attribute filtering removes sandbox', () => {
        const result = sanitize(input, {
            ...defaultOptions,
            transformTags,
            allowedAttributes: {iframe: ['srcdoc', 'data-yfm-sandbox-mode']},
            exclusiveFilter: () => false,
        });

        expect(load(result)('iframe')).toHaveLength(0);
    });

    it('preserves a safe iframe when attribute filtering retains sandbox', () => {
        const result = sanitize(input, {...defaultOptions, transformTags});

        expect(load(result)('iframe').attr('sandbox')).toBe('allow-same-origin');
        expect(documentFor(result)('#marker').text()).toBe('Visible');
    });
});

describe('passive HTML iframe sanitization', () => {
    it('preserves markup and same-origin runtime access with scripts sandboxed', () => {
        const result = sanitize(iframe('<p id="marker">Visible &amp; readable</p>'));
        const outer = load(result)('iframe');
        const inner = documentFor(result);

        expect(outer.attr('sandbox')).toBe('allow-same-origin');
        expect(inner('#marker').text()).toBe('Visible & readable');
        expect(inner('meta[http-equiv="Content-Security-Policy"]').attr('content')).toBe(
            "script-src 'none'; object-src 'none'; base-uri 'none'",
        );
    });

    it('preserves an explicitly empty sandbox instead of silently removing it', () => {
        const result = sanitize(iframe('<p id="marker">Opaque frame</p>', 'sandbox'));
        expect(load(result)('iframe').attr('sandbox')).toBe('');
        expect(documentFor(result)('#marker').text()).toBe('Opaque frame');
    });

    it.each([
        '',
        'sandbox="allow-scripts"',
        'sandbox="allow-same-origin allow-scripts"',
        'sandbox="ALLOW-SCRIPTS"',
        'sandbox="allow-same-origin\tallow-top-navigation"',
        'sandbox="allow-popups-to-escape-sandbox"',
        'sandbox="allow-same-origin\u00a0allow-scripts"',
    ])('keeps srcdoc blocked for an absent or unsafe sandbox: %s', (attrs) => {
        expect(
            load(sanitize(iframe('<p>Untrusted</p>', attrs)))('iframe').attr('srcdoc'),
        ).toBeUndefined();
    });

    it('does not grant srcdoc to ordinary iframes or other elements', () => {
        const result = sanitize(
            '<iframe sandbox="allow-same-origin" srcdoc="&lt;p&gt;not an embed&lt;/p&gt;"></iframe>' +
                '<div data-yfm-sandbox-mode="srcdoc" sandbox srcdoc="payload"></div>',
        );
        expect(load(result)('[srcdoc]')).toHaveLength(0);
    });

    it('retains explicitly requested sandbox restrictions on ordinary URL iframes', () => {
        const result = sanitize(
            '<iframe src="https://example.invalid/" sandbox="allow-scripts"></iframe>',
        );
        expect(load(result)('iframe').attr('sandbox')).toBe('allow-scripts');
        expect(load(result)('iframe').attr('srcdoc')).toBeUndefined();
    });

    it('strips scripting, event handlers, dangerous URLs and nested browsing contexts', () => {
        const dirty =
            '<script>parent.pwned = true</script><p id="marker" onclick="parent.pwned=true">Visible</p>' +
            '<img src="missing" onerror="parent.pwned=true"><a href="javascript:parent.pwned=true">link</a>' +
            '<iframe srcdoc="&lt;script&gt;parent.pwned=true&lt;/script&gt;"></iframe>' +
            '<object data="data:text/html,script"></object><embed src="data:text/html,script">' +
            '<base href="https://example.invalid/"><meta http-equiv="refresh" content="0;url=https://example.invalid/">';
        const result = sanitize(iframe(dirty));
        const inner = documentFor(result);

        expect(inner('#marker').text()).toBe('Visible');
        expect(inner('script, iframe, object, embed, base, [onclick], [onerror]')).toHaveLength(0);
        expect(inner('a').attr('href')).toBeUndefined();
        expect(inner('meta[http-equiv="refresh"]')).toHaveLength(0);
    });

    it('sanitizes styles inside srcdoc as well as the outer document', () => {
        const result = sanitize(
            '<p style="position:fixed">Outer</p>' +
                iframe('<p id="marker" style="position:fixed;color:red">Inner</p>'),
        );
        expect(load(result)('p').attr('style')).toBeUndefined();
        expect(documentFor(result)('#marker').attr('style')).not.toContain('fixed');
        expect(documentFor(result)('#marker').attr('style')).toContain('red');
    });

    it('canonicalizes safe sandbox flags and removes fallback src URLs', () => {
        const result = sanitize(
            iframe(
                '<p>Visible</p>',
                'sandbox=" allow-same-origin\tallow-same-origin " src="https://example.invalid/"',
            ),
        );
        const outer = load(result)('iframe');
        expect(outer.attr('sandbox')).toBe('allow-same-origin');
        expect(outer.attr('src')).toBeUndefined();
    });

    it('blocks srcdoc when HTML normalization selects an unsafe sandbox alias', () => {
        const result = sanitize(
            iframe(
                '<p id="marker">Visible</p>',
                'SANDBOX="allow-scripts" sandbox="allow-same-origin" SRCDOC="&lt;script&gt;parent.pwned=true&lt;/script&gt;"',
            ),
        );
        expect(load(result)('iframe').attr('srcdoc')).toBeUndefined();
    });

    it('removes mixed-case aliases while preserving the canonical safe attributes', () => {
        const result = sanitize(
            iframe(
                '<p id="marker">Visible</p>',
                'SANDBOX="allow-scripts" sandbox="allow-same-origin" SRCDOC="&lt;script&gt;parent.pwned=true&lt;/script&gt;"',
            ),
            {...defaultOptions, disableStyleSanitizer: true},
        );

        expect(result).not.toMatch(/\s(?:SANDBOX|SRCDOC)=/);
        expect(load(result)('iframe').attr('sandbox')).toBe('allow-same-origin');
        expect(documentFor(result)('#marker').text()).toBe('Visible');
        expect(documentFor(result)('script')).toHaveLength(0);
    });

    it.each(['srcdoc', 'sandbox'])('rejects an uppercase-only %s attribute', (name) => {
        const input = iframe('<p>Visible</p>').replace(`${name}=`, `${name.toUpperCase()}=`);
        const result = sanitize(input, {...defaultOptions, disableStyleSanitizer: true});

        expect(load(result)('iframe').attr('srcdoc')).toBeUndefined();
    });

    it('sanitizes every passive iframe in the same document independently', () => {
        const result = sanitize(
            iframe('<p id="first">First</p><script>alert(1)</script>') +
                iframe('<p id="second" onclick="alert(1)">Second</p>'),
        );
        const frames = load(result)('iframe');
        const first = load(frames.eq(0).attr('srcdoc') || '');
        const second = load(frames.eq(1).attr('srcdoc') || '');

        expect(frames).toHaveLength(2);
        expect(first('#first').text()).toBe('First');
        expect(first('script')).toHaveLength(0);
        expect(second('#second').text()).toBe('Second');
        expect(second('[onclick], #first')).toHaveLength(0);
    });

    it('uses the current default policy on each outer sanitizer invocation', () => {
        const input = iframe('<p id="marker" title="Description">Visible</p>');
        expect(documentFor(sanitize(input))('#marker').attr('title')).toBe('Description');

        const originalAttributes = defaultOptions.allowedAttributes;

        try {
            defaultOptions.allowedAttributes = {
                '*': ['id', 'data-*'],
                iframe: ['srcdoc', 'sandbox'],
            };
            const inner = documentFor(sanitize(input));

            expect(inner('#marker').text()).toBe('Visible');
            expect(inner('#marker').attr('title')).toBeUndefined();
        } finally {
            defaultOptions.allowedAttributes = originalAttributes;
        }
    });

    it('keeps the safety policy when callers replace transformTags', () => {
        const result = sanitize(
            iframe('<script>parent.pwned=true</script><p id="marker">Visible</p>'),
            {
                ...defaultOptions,
                transformTags: {'*': (tagName, attribs) => ({tagName, attribs})},
            },
        );
        expect(documentFor(result)('#marker').text()).toBe('Visible');
        expect(documentFor(result)('script')).toHaveLength(0);
        expect(load(result)('iframe').attr('sandbox')).toBe('allow-same-origin');
    });

    it('rejects srcdoc if a custom attribute policy removes sandbox', () => {
        const result = sanitize(iframe('<p>Visible</p>'), {
            ...defaultOptions,
            allowedAttributes: {...defaultOptions.allowedAttributes, iframe: ['srcdoc']},
            exclusiveFilter: () => false,
        });
        expect(load(result)('iframe')).toHaveLength(0);
    });

    it('does not apply iframe restrictions after a custom transform changes it to a div', () => {
        const result = sanitize(iframe('<p>Inert attribute</p>'), {
            ...defaultOptions,
            transformTags: {iframe: 'div'},
            allowedAttributes: {div: ['srcdoc']},
        });

        expect(load(result)('iframe')).toHaveLength(0);
        expect(load(result)('div').attr('srcdoc')).toBe('<p>Inert attribute</p>');
    });

    it('checks the serialized attributes before a custom filter can modify its frame', () => {
        const result = sanitize(iframe('<p>Visible</p>'), {
            ...defaultOptions,
            allowedAttributes: {iframe: ['srcdoc', 'data-yfm-sandbox-mode']},
            exclusiveFilter: (frame) => {
                frame.attribs.sandbox = 'allow-same-origin';
                return false;
            },
        });

        expect(load(result)('iframe')).toHaveLength(0);
    });

    it('does not recursively preserve nested srcdoc documents', () => {
        let content = '<p>Nested</p>';
        for (let depth = 0; depth < 8; depth++) {
            content = iframe(content);
        }
        const result = sanitize(iframe(content));
        expect(documentFor(result)('iframe')).toHaveLength(0);
    });
});

describe.each([
    ['Node', (source: string) => transform(source, {allowHTML: true}).result.html],
    ['portable', (source: string) => portable(source, {allowHTML: true}).result.html],
] as const)('%s Transform sanitizer integration', (_host, render) => {
    it('preserves a passive embed and sanitizes its content through the public Transform API', () => {
        const content =
            '<p id="marker" onclick="alert(1)">Visible HTML</p><script>alert(1)</script>';
        const result = render(iframe(content));

        expect(load(result)('iframe').attr('sandbox')).toBe('allow-same-origin');
        expect(documentFor(result)('#marker').text()).toBe('Visible HTML');
        expect(documentFor(result)('script, [onclick]')).toHaveLength(0);
    });
});
