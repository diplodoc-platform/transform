import NativeMarkdownIt from 'markdown-it';
import {vi} from 'vitest';

import table from '../src/transform/plugins/table';
import {installBrowserGuard} from '../src/transform/browser/guard';
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
