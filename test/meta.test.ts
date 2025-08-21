import dedent from 'ts-dedent';

import transform from '../src/transform';

describe('meta plugin', () => {
    it('treats leading thematic break as content when no closing marker', () => {
        const input = dedent`
        ---
        #### YFM синтаксис

        Синтаксис Yandex Flavored Markdown базируется на CommonMark Spec,
        дополняя его уникальными элементами из других языков разметки и
        шаблонизаторов.

        ## bla
        Bla bla
        `;

        const {result} = transform(input);

        expect(result.meta).toEqual({});
        expect(result.html).toContain('<hr');
    });

    it('treats leading thematic break as content when closing marker later is not YAML', () => {
        const input = dedent`
        ---
        #### YFM синтаксис

        Синтаксис Yandex Flavored Markdown базируется на CommonMark Spec,
        дополняя его уникальными элементами из других языков разметки и
        шаблонизаторов.
        ---
        bla bla
        `;

        const {result} = transform(input);

        expect(result.meta).toEqual({});
        expect(result.html).toContain('<hr');
    });

    it('parses valid front matter', () => {
        const input = dedent`
        ---
        title: Welcome to Markdown-it-meta
        keywords: markdown-it-meta
        runs: 0
        score: 0.0
        demographics:
         - {name: 'unknown'}
        ---
        ## Hello World
        `;

        const {result} = transform(input);

        expect(result.meta).toMatchObject({
            title: 'Welcome to Markdown-it-meta',
            keywords: 'markdown-it-meta',
            runs: 0,
            score: 0.0,
            demographics: [{name: 'unknown'}],
        });
        expect(result.html).toContain('Hello World');
    });
});
