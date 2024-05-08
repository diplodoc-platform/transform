import {dirname, resolve} from 'path';
import {readFileSync} from 'fs';
import transform from '../src/transform';
import links from '../src/transform/plugins/links';
import includes from '../src/transform/plugins/includes';
import {callPlugin, tokenize} from './utils';
import {customTitle, title} from './data/links';
import {getPublicPath} from '../src/transform/utilsFS';

import {log} from '../src/transform/log';
import type {OptionsType} from '../src/transform/typings';

const mocksPath = require.resolve('./utils.ts');

const transformYfm = (
    text: string,
    path?: string,
    extraOpts?: OptionsType,
    hasDefaultPath = false,
) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [includes, links],
        path: path || mocksPath,
        root: dirname(path || mocksPath),
        ...(hasDefaultPath ? {} : {getPublicPath}),
        ...extraOpts,
    });
    return html;
};

const expectObject = (a: unknown, b: unknown) => {
    expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
};

describe('Links', () => {
    test('Should create link with custom title', () => {
        const result = callPlugin(
            links,
            tokenize([
                'Text before link',
                '',
                '[Custom title](./mocks/link.md) %}',
                '',
                'After link',
            ]),
            {
                path: mocksPath,
                root: dirname(mocksPath),
                log: log,
                getPublicPath,
            },
        );

        expectObject(result, customTitle);
    });

    test('Should create link with title from target', () => {
        const result = callPlugin(
            links,
            tokenize(['Text before link', '', '[{#T}](./mocks/link.md)', '', 'After link']),
            {
                path: mocksPath,
                root: dirname(mocksPath),
                getPublicPath,
            },
        );

        expect(result).toEqual(title);
    });

    test('Should create link with title from target with include in the middle', () => {
        const input = '[{#T}](./mocks/include-link.md)';
        const result = transformYfm(input);

        expect(result).toEqual('<p><a href="mocks/include-link.html">Title</a></p>\n');
    });

    test('Should create link with title from target with circular include', () => {
        const inputPath = resolve(__dirname, './mocks/circular-include/first.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toEqual('<h1>First</h1>\n<p><a href="second.html">Second</a></p>\n');
    });

    test('Should create link with title from target with circular link', () => {
        const inputPath = resolve(__dirname, './mocks/circular-link/first.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toEqual('<h1>First</h1>\n<p><a href="second.html">Second</a></p>\n');
    });

    test('Should create link with the absolute path', () => {
        const inputPath = resolve(__dirname, './mocks/absolute-link.md');
        const input = readFileSync(inputPath, 'utf8');
        const result = transformYfm(input, inputPath);

        expect(result).toEqual('<p><a href="/link/">Absolute link</a></p>\n');
    });

    test('Should create link with the absolute path from the included file', () => {
        const result = transformYfm(
            ['', '{% include [create-folder](./mocks/absolute-link.md) %}', ''].join('\n'),
        );

        expect(result).toEqual('<p><a href="/link/">Absolute link</a></p>\n');
    });

    describe('transformLink', () => {
        test('Should call the "transformLink" callback for local link', () => {
            const inputPath = resolve(__dirname, './mocks/relative-link.md');
            const input = readFileSync(inputPath, 'utf8');

            let result = '';

            transformYfm(input, inputPath, {
                transformLink: (href: string) => {
                    href = href.replace('.md', '');
                    result = href;
                    return href;
                },
            });

            expect(result).toEqual('../link');
        });
        test('Should call the "transformLink" callback for local link with default path', () => {
            const inputPath = resolve(__dirname, './mocks/relative-link.md');
            const input = readFileSync(inputPath, 'utf8');

            let result = '';

            transformYfm(
                input,
                'mocks/relative-link.md',
                {
                    transformLink: (href: string) => {
                        href = href.replace('.md', '');
                        result = href;
                        return href;
                    },
                },
                true,
            );

            expect(result).toEqual('../link');
        });

        test('Should call the "transformLink" callback for absolute link', () => {
            const inputPath = resolve(__dirname, './mocks/absolute-link.md');
            const input = readFileSync(inputPath, 'utf8');

            let result = '';

            transformYfm(input, inputPath, {
                transformLink: (href: string) => {
                    href = href.replace('.md', '');
                    result = href;
                    return href;
                },
            });

            expect(result).toEqual('/link/');
        });

        test('Should call the "transformLink" callback for absolute link with default path', () => {
            const inputPath = resolve(__dirname, './mocks/absolute-link.md');
            const input = readFileSync(inputPath, 'utf8');

            let result = '';

            transformYfm(
                input,
                'mocks/absolute-link.md',
                {
                    transformLink: (href: string) => {
                        href = href.replace('.md', '');
                        result = href;
                        return href;
                    },
                },
                true,
            );

            expect(result).toEqual('/link/');
        });

        test('Should not call the "transformLink" callback for external link', () => {
            const inputPath = resolve(__dirname, './mocks/external-link.md');
            const input = readFileSync(inputPath, 'utf8');

            let link = '';

            const html = transformYfm(input, inputPath, {
                transformLink: (href: string) => {
                    link = href;
                    return href;
                },
            });

            expect(link).not.toEqual('https://test.com/');
            expect(html).toEqual(
                '<p><a href="https://test.com/" target="_blank" rel="noreferrer noopener">Absolute link</a></p>\n',
            );
        });

        test('Should not call the "transformLink" callback for external link with default path', () => {
            const inputPath = resolve(__dirname, './mocks/external-link.md');
            const input = readFileSync(inputPath, 'utf8');

            let link = '';

            const html = transformYfm(
                input,
                'mocks/external-link.md',
                {
                    transformLink: (href: string) => {
                        link = href;
                        return href;
                    },
                },
                true,
            );

            expect(link).not.toEqual('https://test.com/');
            expect(html).toEqual(
                '<p><a href="https://test.com/" target="_blank" rel="noreferrer noopener">Absolute link</a></p>\n',
            );
        });
    });
});
