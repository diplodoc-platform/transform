import NativeMarkdownIt from 'markdown-it';
import {vi} from 'vitest';

import table from '../src/transform/plugins/table';
import {indexHtmlClosers, installBrowserGuard} from '../src/transform/browser/guard';
import {BrowserUnsupportedFeatureError} from '../src/transform/browser/errors';

import {unsupportedFixtures} from './data/browser-unsupported';

function setup(standard: boolean, html = false) {
    const md = new NativeMarkdownIt({html});
    if (standard) {
        md.use(table);
    }
    installBrowserGuard(md);
    const calls = vi.fn();
    md.core.ruler.before('block', 'caller-observation', calls);
    return {md, calls};
}

for (const standard of [false, true]) {
    describe(standard ? 'standard position hooks' : 'minimal position hooks', () => {
        test.each(unsupportedFixtures.filter(({id}) => standard || id !== 'include-table'))(
            '$id',
            ({source, expected, feature}) => {
                const {md, calls} = setup(standard);
                if (expected === 'throw') {
                    try {
                        md.render(source);
                        throw new Error('Expected browser capability error');
                    } catch (error) {
                        expect(error).toBeInstanceOf(BrowserUnsupportedFeatureError);
                        if (error instanceof BrowserUnsupportedFeatureError) {
                            expect(error.code).toBe('BROWSER_UNSUPPORTED_FEATURE');
                            expect(error.feature).toBe(feature);
                        }
                    }
                } else {
                    const baseline = new NativeMarkdownIt();
                    if (standard) {
                        baseline.use(table);
                    }
                    expect(md.render(source)).toBe(baseline.render(source));
                }
                expect(calls).toHaveBeenCalledTimes(1);
                expect(md.render('next root')).toContain('next root');
                expect(calls).toHaveBeenCalledTimes(2);
            },
        );
    });
}

test.each([
    '<!--\n\n{% included (child.md) %}\n\n-->',
    '<div data-example="\n\n{% included (child.md) %}\n\n">example</div>',
    '[\n{% included (child.md) %}\n](https://example.test)',
    '![\n{% included (child.md) %}\n](image.png)',
    'Prose\n{% include [child](child.md) %}',
    '\\{% included (child.md) %}',
    '\\\\{% included (child.md) %}',
    '`` opening\n{% included (child.md) %}\nclosing ``',
])('protected source retains exact native parsing: %s', (source) => {
    const {md} = setup(false);
    expect(md.render(source)).toBe(new NativeMarkdownIt().render(source));
});

test.each([false, true])('HTML comment/tag examples remain protected with html=%s', (html) => {
    const {md} = setup(false, html);
    const source =
        '<!--\n\n{% included (child.md) %}\n\n-->\n\n<div data-example="\n{% included (child.md) %}\n">example</div>';
    expect(md.render(source)).toBe(new NativeMarkdownIt({html}).render(source));
});

test.each([
    ['First\r\n\r\n> {% included (child.md) %}', 3, 3],
    ['- first\n\n  {% included (child.md) %}', 3, 3],
    ['#|\n|| {% include [child](child.md) %} ||\n|#', 2, 4],
] as const)('native source maps retain diagnostic location: %s', (source, line, column) => {
    const {md} = setup(true);
    try {
        md.render(source, {path: ' child.md '});
        throw new Error('Expected browser capability error');
    } catch (error) {
        expect(error).toBeInstanceOf(BrowserUnsupportedFeatureError);
        if (error instanceof BrowserUnsupportedFeatureError) {
            expect(error.location).toEqual({path: ' child.md ', line, column});
        }
    }
});

test('comments inside code do not protect a later actual construct', () => {
    const {md} = setup(false);
    expect(() => md.render('```\n<!--\n```\n\n{% included (child.md) %}')).toThrow(
        BrowserUnsupportedFeatureError,
    );
});

test.each([
    ['Intro\n\n| h |\n|---|\n| {% include [a](b.md) %} |', 5, 3],
    ['Intro\n\n| {% included (child.md) %} | h |\n|---|---|', 3, 3],
    ['| same | same | h |\n|---|---|---|\n| same | same | {% included (child.md) %} |', 3, 17],
    ['| h | h |\n|---|---|\n| a\\|b | {% include [a](b.md) %} |', 3, 10],
    ['| h | h |\n|---|---|\n| `a\\|b` | {% included (child.md) %} |', 3, 12],
    ['> | h |\n> |---|\n> | {% included (child.md) %} |', 3, 5],
    ['- | h |\n  |---|\n  | {% included (child.md) %} |', 3, 5],
    ['> - | h |\n>   |---|\n>   | {% included (child.md) %} |', 3, 7],
    ['| h | h | h |\n|---|---|---|\n| `a|b` | {% included (child.md) %} |', 3, 11],
    ['> - | {% included (child.md) %} |\n>   |---|', 1, 7],
    ['> > | h |\n> > |---|\n> > | {% included (child.md) %} |', 3, 7],
    ['Intro\r\n\r\n| h |\r\n|---|\r\n| {% include [a](b.md) %} |', 5, 3],
] as const)('native GFM cell origins point to the actual source: %s', (source, line, column) => {
    const {md} = setup(false);
    expect(() => md.render(source, {path: 'table.md'})).toThrow(BrowserUnsupportedFeatureError);
    try {
        md.render(source, {path: 'table.md'});
    } catch (error) {
        expect(error).toBeInstanceOf(BrowserUnsupportedFeatureError);
        if (error instanceof BrowserUnsupportedFeatureError) {
            expect(error.location).toEqual({path: 'table.md', line, column});
        }
    }
});

function oldTagEnd(source: string, start: number): number | undefined {
    let quote = '';
    for (let index = start + 1; index < source.length; index++) {
        const char = source[index];
        if (quote) {
            if (char === quote) quote = '';
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (char === '>') {
            return index + 1;
        }
    }
    return undefined;
}

test('suffix index preserves old independent scans across malformed and quoted HTML', () => {
    const sources = [
        '<a '.repeat(100),
        '<a "unterminated <b >',
        '<a \'unterminated <b "quoted >" >',
        '<a title="one > two" data=\'three > four\'>',
        '<a\n title="one\n> two"\n> tail <b>',
        '<!-- unclosed <!-- nested',
        '<!--> tail',
        '<!---> tail',
        '<!--> tail -->',
        '<!-- a --> <a "x>y"> <!-- b -->',
    ];
    let seed = 17;
    const alphabet = '<a ->\'"\n';
    for (let sample = 0; sample < 300; sample++) {
        let source = '<a ';
        for (let index = 0; index < 80; index++) {
            seed = (seed * 1664525 + 1013904223) % 2 ** 32;
            source += alphabet[seed % alphabet.length];
        }
        sources.push(source);
    }
    for (const source of sources) {
        const actual = indexHtmlClosers(source);
        for (let start = source.indexOf('<'); start >= 0; start = source.indexOf('<', start + 1)) {
            expect(actual.tags.get(start)).toBe(oldTagEnd(source, start));
            const close = source.indexOf('-->', start + 4);
            if (source.startsWith('<!--', start)) {
                expect(actual.comments.get(start)).toBe(close < 0 ? source.length : close + 3);
            }
        }
    }
});

test.each([1000, 2000, 4000])(
    'HTML suffix indexing performs bounded character work for %s candidates',
    (size) => {
        const source = 'text <a '.repeat(size);
        let reads = 0;
        const counted = new Proxy(Object(source), {
            get(target, key) {
                if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
                return Reflect.get(target, key);
            },
        }) as unknown as string;
        expect(indexHtmlClosers(counted).tags.size).toBe(0);
        expect(reads).toBeLessThanOrEqual(source.length * 3);
    },
);

test.each([
    '<a data="one > two\n\n{% included (child.md) %}\n">text</a>',
    "<a data='one > two\n\n{% included (child.md) %}\n'>text</a>",
    '<!-- unclosed\n\n{% included (child.md) %}',
    '<a "unterminated <b >\n\n`{% included (child.md) %}`',
    '| h | h |\n|---|---|\n| `a|b` | ordinary |',
    '| h | h |\n|---|---|\n| `a\\|b` | ordinary |',
])('quote shielding and actual GFM splitting retain native rendering: %s', (source) => {
    const {md} = setup(false);
    expect(md.render(source)).toBe(new NativeMarkdownIt().render(source));
});

test.each([1000, 2000, 4000])(
    'long native cells preserve escaped pipes and the next cell origin: %s',
    (count) => {
        const prefix = 'a\\|'.repeat(count);
        const source = `| h | h |\n|---|---|\n| ${prefix} | {% included (child.md) %} |`;
        const {md} = setup(false);
        const baseline = new NativeMarkdownIt();
        const ordinary = source.replace('{% included (child.md) %}', 'ordinary');
        expect(md.render(ordinary)).toBe(baseline.render(ordinary));
        try {
            md.render(source);
            throw new Error('Expected browser capability error');
        } catch (error) {
            expect(error).toBeInstanceOf(BrowserUnsupportedFeatureError);
            if (error instanceof BrowserUnsupportedFeatureError) {
                expect(error.location).toEqual({
                    path: '<input>',
                    line: 3,
                    column: prefix.length + 6,
                });
            }
        }
    },
);
