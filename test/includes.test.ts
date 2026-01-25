import {readFile, symlink, unlink} from 'node:fs/promises';
import {dirname, resolve} from 'path';
import dedent from 'ts-dedent';
import {describe, expect, test, vi} from 'vitest';

import transform from '../src/transform';
import includes from '../src/transform/plugins/includes';
import yfmlint from '../src/transform/yfmlint';
import {log} from '../src/transform/log';

import {callPlugin, tokenize} from './utils';
import {codeInBackQuote, notitle, sharpedFile, title} from './data/includes';

const mocksPath = require.resolve('./mocks/link.md');
const symLinkPath = resolve(__dirname, './mocks/symlink.md');
const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [includes],
        path: mocksPath,
        root: dirname(mocksPath),
    });
    return html;
};

describe('Includes', () => {
    beforeEach(() => {
        log.clear();
    });

    test('Simple include', async () => {
        const expectPath = resolve(__dirname, './mocks/include.expect.html');
        const expectContent = await readFile(expectPath, 'utf8');

        const html = transformYfm(dedent`
            start main

            {% include [test](./include.md) %}

            end main
        `);

        expect(html).toBe(expectContent);
    });

    test('Symlink include', async () => {
        const expectPath = resolve(__dirname, './mocks/include.expect.html');
        const expectContent = await readFile(expectPath, 'utf8');

        await symlink(resolve(__dirname, './mocks/include.md'), symLinkPath);

        const html = transformYfm(dedent`
            start main

            {% include [test](./symlink.md) %}

            end main
        `);

        expect(html).toBe(expectContent);

        await unlink(symLinkPath);
    });

    test('Include symlink outside root', async () => {
        const expectPath = resolve(__dirname, './mocks/include-outside-symlink.expect.html');
        const expectContent = await readFile(expectPath, 'utf8');

        await symlink(resolve(__dirname, 'includes.test.ts'), symLinkPath);

        const html = transformYfm(dedent`
            start main

            {% include [test](./symlink.md) %}

            end main
        `);

        expect(html).toBe(expectContent);

        await unlink(symLinkPath);
    });

    test('Should include with title', () => {
        const mocksPath = require.resolve('./utils.ts');

        const result = callPlugin(
            includes,
            tokenize([
                'Text before include',
                '',
                '{% include [create-folder](./mocks/include.md) %}',
                '',
                'After include',
            ]),
            {
                path: mocksPath,
                root: dirname(mocksPath),
            },
        );

        expect(result).toEqual(title);
    });

    test('Should include with code in back quote', () => {
        const mocksPath = require.resolve('./utils.ts');

        const result = callPlugin(
            includes,
            tokenize([
                'Text before include',
                '',
                '{% include [create-folder](./mocks/include-code-in-back-quote.md) %}',
                '',
                'After include',
            ]),
            {
                path: mocksPath,
                root: dirname(mocksPath),
                vars: {condition: 'true'},
                conditionsInCode: true,
            },
        );

        expect(result).toEqual(codeInBackQuote);
    });

    test('Should include without title', () => {
        const mocksPath = require.resolve('./utils.ts');

        const result = callPlugin(
            includes,
            tokenize([
                'Text before include',
                '',
                '{% include notitle [create-folder](./mocks/include.md) %}',
                '',
                'After include',
            ]),
            {
                path: mocksPath,
                root: dirname(mocksPath),
            },
        );

        expect(result).toEqual(notitle);
    });

    test('Should call notFoundCb for exception', () => {
        const mocksPath = require.resolve('./utils.ts');
        const cb = vi.fn();

        callPlugin(
            includes,
            tokenize([
                'Text before include',
                '',
                '{% include notitle [create-folder](./mocks/fake.md) %}',
                '',
                'After include',
            ]),
            {
                path: mocksPath,
                root: dirname(mocksPath),
                notFoundCb: cb,
                log,
            },
        );

        expect(cb.mock.calls[0][0]).toEqual('/mocks/fake.md');
    });

    test('Lint include file', () => {
        const mocksPath = require.resolve('./utils.ts');
        const input = [
            'Text before include',
            '{% include [create-folder](./mocks/include-lint-test.md) %}',
            'After include',
        ].join('\n\n');

        function lintMarkdown({input, path}: {input: string; path: string}) {
            yfmlint({
                input,
                pluginOptions: {
                    log,
                    path,
                    root: dirname(mocksPath),
                    lintMarkdown,
                },
                plugins: [includes],
            });
        }

        lintMarkdown({input, path: mocksPath});

        const warn = log.get().warn[0];

        expect(warn).toMatch('include-lint-test.md: 3: YFM001/inline-code-length');
    });

    test('Should include file with sharped path', () => {
        const mocksPath = require.resolve('./utils.ts');

        const result = callPlugin(
            includes,
            tokenize([
                'Text before include',
                '',
                '{% include [file](./mocks/folder-with-#-sharp/file-with-#-sharp.md) %}',
                '',
                'After include',
            ]),
            {
                path: mocksPath,
                root: dirname(mocksPath),
            },
        );

        expect(result).toEqual(sharpedFile);
    });
});
