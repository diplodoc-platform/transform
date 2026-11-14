import type MarkdownIt from 'markdown-it';

import {copyFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {buildSync} from 'esbuild';
import {load} from 'cheerio';

import transform from '../src/transform';
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

    it('removes mixed-case srcdoc and sandbox aliases before emitting a safe frame', () => {
        const result = sanitize(
            iframe(
                '<p id="marker">Visible</p>',
                'SANDBOX="allow-scripts" sandbox="allow-same-origin" SRCDOC="&lt;script&gt;parent.pwned=true&lt;/script&gt;"',
            ),
        );
        const outer = load(result)('iframe');
        if (outer.attr('srcdoc')) {
            expect(outer.attr('sandbox')).toBe('allow-same-origin');
            expect(documentFor(result)('script')).toHaveLength(0);
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

    it('does not recursively preserve nested srcdoc documents', () => {
        let content = '<p>Nested</p>';
        for (let depth = 0; depth < 8; depth++) {
            content = iframe(content);
        }
        const result = sanitize(iframe(content));
        expect(documentFor(result)('iframe')).toHaveLength(0);
    });
});

describe('published HTML extension with both sanitizers enabled', () => {
    const require = createRequire(join(__dirname, 'sanitize-iframe.test.ts'));
    const root = join(__dirname, '..');
    let fixture: string;
    let htmlPlugin: {transform: (options: Record<string, unknown>) => MarkdownIt.PluginSimple};

    beforeAll(() => {
        const modules = join(root, 'node_modules');
        mkdirSync(modules, {recursive: true});
        fixture = mkdtempSync(join(modules, '.html-sanitize-'));
        // A published plugin imports its host's public sanitizer. Supply the
        // current source build in an isolated host, without global require hooks.
        buildSync({
            entryPoints: [join(root, 'src/transform/sanitize.ts')],
            outfile: join(fixture, 'node_modules/@diplodoc/transform/lib/sanitize.js'),
            bundle: true,
            packages: 'external',
            platform: 'node',
            format: 'cjs',
        });
        copyFileSync(require.resolve('@diplodoc/html-extension'), join(fixture, 'html-plugin.cjs'));
        htmlPlugin = require(join(fixture, 'html-plugin.cjs'));
    });

    afterAll(() => {
        if (fixture) rmSync(fixture, {recursive: true, force: true});
    });

    it('renders the real directive with its default sanitizer and the outer Transform sanitizer', () => {
        const markdown =
            '::: html\n\n<p id="marker" onclick="alert(1)">Visible HTML</p><script>alert(1)</script>\n\n:::\n';
        const result = transform(markdown, {
            allowHTML: true,
            needToSanitizeHtml: true,
            plugins: [htmlPlugin.transform({bundle: false, sandbox: 'allow-same-origin'})],
        }).result.html;

        expect(load(result)('iframe').attr('sandbox')).toBe('allow-same-origin');
        expect(documentFor(result)('#marker').text()).toBe('Visible HTML');
        expect(documentFor(result)('script, [onclick]')).toHaveLength(0);
    });

    it('retains the outer protection even if a custom HTML plugin sanitizer returns unsafe input', () => {
        const markdown =
            '::: html\n\n<p id="marker" onclick="alert(1)">Visible HTML</p><script>alert(1)</script>\n\n:::\n';
        const result = transform(markdown, {
            allowHTML: true,
            needToSanitizeHtml: true,
            plugins: [
                htmlPlugin.transform({
                    bundle: false,
                    sandbox: 'allow-same-origin',
                    sanitize: (value: string) => value,
                }),
            ],
        }).result.html;

        expect(documentFor(result)('#marker').text()).toBe('Visible HTML');
        expect(documentFor(result)('script, [onclick]')).toHaveLength(0);
    });
});
