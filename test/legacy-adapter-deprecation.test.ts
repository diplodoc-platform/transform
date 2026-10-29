import MarkdownIt from 'markdown-it';
import {vi} from 'vitest';
import {transform as createCut} from '@diplodoc/cut-extension';
import {transform as createTabs} from '@diplodoc/tabs-extension';

import transform from '../src/transform';
import {createDeprecationReporter} from '../src/transform/deprecation';
import {defineLegacyPlugin} from '../src/transform/plugin-configuration';
import cut from '../src/transform/plugins/cut';
import tabs from '../src/transform/plugins/tabs';
import preset from '../src/transform/plugins';

describe('legacy extension callbacks', () => {
    const consumer = () => ({info: vi.fn(), warn: vi.fn(), error: vi.fn()});

    test('keeps the preset identities and the cut collector', () => {
        expect(preset[2]).toBe(cut);
        expect(preset[5]).toBe(tabs);
        expect(cut.collect).toBeTypeOf('function');
    });

    test('automatic default and named builtins do not warn', () => {
        const log = consumer();
        transform('Hello', {disableLiquid: true, log});
        transform('Hello', {disableLiquid: true, log, pluginConfiguration: {}});
        expect(log.warn).not.toHaveBeenCalled();
    });

    test('explicit callbacks warn and custom delegation is not suppressed', () => {
        const log = consumer();
        transform('Hello', {disableLiquid: true, log, path: 'guide.md', plugins: [cut, tabs]});
        expect(log.warn.mock.calls.map(([message]) => message).join('\n')).toContain(
            'LEGACY_CUT_CALLBACK',
        );
        expect(log.warn.mock.calls.map(([message]) => message).join('\n')).toContain(
            'LEGACY_TABS_CALLBACK',
        );
        const delegated = defineLegacyPlugin({id: 'custom-cut', plugin: cut})({});
        transform('Hello', {disableLiquid: true, log, pluginConfiguration: {plugins: [delegated]}});
        expect(
            log.warn.mock.calls.filter(([message]) => message.includes('LEGACY_CUT_CALLBACK')),
        ).toHaveLength(2);
    });

    test('reporting is scoped and native calls remain silent', () => {
        const log = consumer();
        const reporter = createDeprecationReporter({log});
        const options = {output: '.', deprecations: reporter, path: 'guide.md'};
        cut(new MarkdownIt(), options);
        cut(new MarkdownIt(), options);
        expect(log.warn).toHaveBeenCalledTimes(1);
        const nextOptions = {
            output: '.',
            deprecations: createDeprecationReporter({log}),
            path: 'guide.md',
        };
        cut(new MarkdownIt(), nextOptions);
        expect(log.warn).toHaveBeenCalledTimes(2);
        expect(() => cut(new MarkdownIt())).not.toThrow();
    });
});

test.each(['', ' radio', ' dropdown', ' accordion'])(
    'tabs adapter preserves direct factory behavior for %s',
    (variant) => {
        const source = `{% list tabs${variant} %}\n\n- First\n\n  Body\n\n- Second\n\n  Other\n\n{% endlist %}`;
        const direct = createTabs({
            bundle: false,
            features: {
                enabledVariants: {radio: true, regular: true, dropdown: true, accordion: true},
            },
        });
        const run = (plugin: typeof tabs) => {
            let sequence = 0;
            const generateID = vi.fn(() => `id-${++sequence}`);
            const env = {};
            const html = new MarkdownIt()
                .use(plugin, {output: '/out', generateID})
                .render(source, env);
            return {html, env, calls: generateID.mock.calls};
        };
        expect(run(tabs)).toEqual(run(direct));
    },
);

test('cut adapter preserves direct factory behavior for nested cuts', () => {
    const source = '{% cut "Outer" %}\n\n{% cut "Inner" %}\n\nBody\n\n{% endcut %}\n\n{% endcut %}';
    const direct = createCut({bundle: false, directiveSyntax: 'disabled'});
    const run = (plugin: typeof cut) => {
        const env = {};
        const html = new MarkdownIt().use(plugin, {output: '/out'}).render(source, env);
        return {html, env};
    };
    expect(run(cut)).toEqual(run(direct));
});
