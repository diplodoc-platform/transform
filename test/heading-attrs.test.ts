import {dirname} from 'path';
import {load} from 'cheerio';

import transform from '../src/transform';
import anchors from '../src/transform/plugins/anchors';
import includes from '../src/transform/plugins/includes';

const mocksPath = require.resolve('./mocks/link.md');
const publicPath = '/docs/page.html';

describe.each([false, true])('Heading attributes (includes=%s)', (withIncludes) => {
    const render = (source: string, options?: transform.Options) =>
        transform(source, {
            plugins: withIncludes ? [includes, anchors] : [anchors],
            path: mocksPath,
            root: dirname(mocksPath),
            getPublicPath: () => publicPath,
            enableMarkdownAttrs: true,
            needFlatListHeadings: true,
            ...options,
        }).result;

    it.each([
        '{#custom data-role="section"}',
        '{data-role="section" #custom}',
        '{id="custom" data-role="section"}',
        '{#custom .first .second data-role="section"}',
    ])('keeps the explicit ID and every heading link consistent: %s', (attributes) => {
        const result = render(`### Heading with attributes ${attributes}`);
        const document = load(result.html);
        const heading = document('h3');

        expect(heading.attr('id')).toBe('custom');
        expect(heading.attr('data-role')).toBe('section');
        expect(heading.find('a').attr('href')).toBe(`${publicPath}#custom`);
        expect(heading.find('a span').text()).toBe('Heading with attributes');
        heading.find('a').remove();
        expect(heading.text()).toBe('Heading with attributes');
        expect(result.headings).toEqual([
            {title: 'Heading with attributes', href: `${publicPath}#custom`, level: 3},
        ]);
        if (attributes.includes('.first')) {
            expect(heading.attr('class')).toBe('first second');
        }
    });

    it('preserves existing automatic URLs while keeping anchor labels clean', () => {
        const result = render('### Heading with attributes {.first data-role="section"}');
        const heading = load(result.html)('h3');

        const id = withIncludes
            ? 'heading-with-attributes-first-data-role=section'
            : 'heading-with-attributes';
        expect(heading.attr('id')).toBe(id);
        expect(heading.attr('class')).toBe('first');
        expect(heading.find('a').attr('href')).toBe(`${publicPath}#${id}`);
        expect(heading.find('a span').text()).toBe('Heading with attributes');
        expect(result.headings[0].title).toBe('Heading with attributes');
    });

    it('uses an explicit mixed-attribute ID with or without includes', () => {
        const result = render('## Title {#a .b}');
        const heading = load(result.html)('h2');
        expect(heading.attr('id')).toBe('a');
        expect(heading.attr('class')).toBe('b');
        expect(heading.find('a').attr('href')).toBe(`${publicPath}#a`);
        expect(result.headings[0].href).toBe(`${publicPath}#a`);
    });

    it('keeps duplicate explicit IDs and anchor links consistent after deduplication', () => {
        const result = render(
            '### First heading {#custom data-role="section"}\n\n' +
                '### Second heading {#custom data-role="section"}',
        );
        const document = load(result.html);

        expect(
            document('h3')
                .map((_index, element) => document(element).attr('id'))
                .get(),
        ).toEqual(['custom', 'custom1']);
        expect(
            document('h3 a')
                .map((_index, element) => document(element).attr('href'))
                .get(),
        ).toEqual([`${publicPath}#custom`, `${publicPath}#custom1`]);
        expect(result.headings.map((heading) => heading.href)).toEqual([
            `${publicPath}#custom`,
            `${publicPath}#custom1`,
        ]);
    });

    it.each(['{# deployment-preparation}', '{# worker-logs }', '{# puncher}'])(
        'falls back to a nonempty legacy slug for an empty parsed ID: %s',
        (attributes) => {
            const result = render(`## Подготовьте окружение ${attributes}`);
            const heading = load(result.html)('h2');
            const suffix = attributes.replace(/[{}# ]/g, '');
            const id = withIncludes ? `podgotovte-okruzhenie-${suffix}` : 'podgotovte-okruzhenie';

            expect(heading.attr('id')).toBe(id);
            expect(heading.find('a').attr('href')).toBe(`${publicPath}#${id}`);
            expect(heading.find('a span').text()).toBe('Подготовьте окружение');
            expect(result.headings).toEqual([
                {title: 'Подготовьте окружение', href: `${publicPath}#${id}`, level: 2},
            ]);
        },
    );

    it('does not use numeric-only IDs to deduplicate empty parsed IDs', () => {
        const result = render('## First {# broken}\n\n## Second {# another}');
        const document = load(result.html);
        const ids = withIncludes ? ['first-broken', 'second-another'] : ['first', 'second'];

        expect(
            document('h2')
                .map((_index, element) => document(element).attr('id'))
                .get(),
        ).toEqual(ids);
        expect(result.headings.map((heading) => heading.href)).toEqual(
            ids.map((id) => `${publicPath}#${id}`),
        );
    });

    it('keeps the accepted first-word ID for multi-word shorthand IDs', () => {
        const result = render('## Custom section {#custom Multiple Words}');
        const heading = load(result.html)('h2');

        expect(heading.attr('id')).toBe('custom');
        expect(heading.find('a').attr('href')).toBe(`${publicPath}#custom`);
        expect(result.headings[0].href).toBe(`${publicPath}#custom`);
    });

    it.each([false, true])('trims visible titles, labels and headings (flat=%s)', (flat) => {
        const result = render('#### Build docs  { #build-docs }', {
            needFlatListHeadings: flat,
        });
        const heading = load(result.html)('h4');
        const button = load(
            render('#### Build docs  { #build-docs }', {
                useCommonAnchorButtons: true,
                lang: 'en',
            }).html,
        )('h4 button');

        expect(heading.find('a span').text()).toBe('Build docs');
        heading.find('a').remove();
        expect(heading.text()).toBe('Build docs');
        expect(button.attr('data-href')).toBe(`${publicPath}#build-docs`);
        if (flat) {
            expect(result.headings[0].title).toBe('Build docs');
        } else {
            const nested = render('## Parent\n\n### Build docs  { #build-docs }', {
                needFlatListHeadings: false,
            });
            expect(nested.headings[0].items?.[0].title).toBe('Build docs');
        }
    });

    it.each(['{# broken}', '{#}'])(
        'marks empty shorthand IDs only during lint runs: %s',
        (attributes) => {
            const source = `# Title ${attributes}\n\n## Section ${attributes}`;
            const lintTokens = transform(source, {
                plugins: withIncludes ? [includes, anchors] : [anchors],
                path: mocksPath,
                root: dirname(mocksPath),
                enableMarkdownAttrs: true,
                extractTitle: false,
                isLintRun: true,
                tokens: true,
            });

            expect(
                lintTokens
                    .filter((token) => token.type === 'heading_open')
                    .map((token) => token.attrGet('YFM024')),
            ).toEqual(['true', 'true']);
            expect(
                transform(source, {
                    plugins: withIncludes ? [includes, anchors] : [anchors],
                    path: mocksPath,
                    root: dirname(mocksPath),
                    enableMarkdownAttrs: true,
                    tokens: true,
                })
                    .filter((token) => token.type === 'heading_open')
                    .map((token) => token.attrGet('YFM024')),
            ).toEqual([null, null]);
        },
    );

    it.each([
        '## Title {#good}',
        '## Title { #good }',
        '## Title {#good .class data-role="section" title="two words"}',
        '## Title {#good hidden}',
        '## Title {#good data-x}',
        '## Title {#good hidden data-x}',
        '## Title {#good custom-flag}',
        '## Title {#custom Multiple Words}',
        '## Title {#good title="literal # text"}',
        '## Title {#\tvalue}',
        '## Title {#one} {#two}',
        '## Literal `{# bad}`',
        '## Literal `{#bad words}` {#good}',
        'Body {# bad}',
        '```\n## Code {# bad}\n```',
    ])('does not mark valid attributes or literal IDs: %s', (source) => {
        const result = transform(source, {
            plugins: withIncludes ? [includes, anchors] : [anchors],
            path: mocksPath,
            root: dirname(mocksPath),
            enableMarkdownAttrs: true,
            isLintRun: true,
            tokens: true,
        });
        expect(result.some((token) => token.attrGet('YFM024'))).toBe(false);
    });

    it('keeps legacy multiple custom anchor IDs', () => {
        const heading = load(render('### Heading {#first} {#second}').html)('h3');

        expect(heading.attr('id')).toBe('first');
        expect(
            heading
                .find('a')
                .map((_index, element) => load(element)('a').attr('href'))
                .get()
                .sort(),
        ).toEqual([`${publicPath}#first`, `${publicPath}#second`]);
    });

    it.each(['hidden', 'data-x', 'custom-flag', 'multiple words'])(
        'preserves arbitrary boolean attributes without sanitization: %s',
        (attributes) => {
            const result = render(`## Title {#custom ${attributes}}`, {needToSanitizeHtml: false});
            const heading = load(result.html)('h2');
            expect(heading.attr('id')).toBe('custom');
            for (const attribute of attributes.split(' ')) {
                expect(heading.prop('attribs')).toMatchObject({[attribute]: ''});
            }
        },
    );

    it('preserves legacy custom IDs when Markdown attributes are disabled', () => {
        const heading = load(render('### Heading {#custom}', {enableMarkdownAttrs: false}).html)(
            'h3',
        );

        expect(heading.attr('id')).toBe('custom');
        expect(heading.find('a').attr('href')).toBe(`${publicPath}#custom`);
        expect(heading.find('a span').text()).toBe('Heading');
    });

    it('does not enable mixed Markdown attributes when they are disabled', () => {
        const heading = load(
            render('### Heading {#custom data-role="section"}', {enableMarkdownAttrs: false}).html,
        )('h3');

        expect(heading.attr('data-role')).toBeUndefined();
        heading.find('a').remove();
        expect(heading.text()).toBe('Heading {#custom data-role="section"}');
    });

    it('preserves custom attribute delimiters', () => {
        const heading = load(
            render('### Heading [#custom data-role="section"]', {
                leftDelimiter: '[',
                rightDelimiter: ']',
            }).html,
        )('h3');

        expect(heading.attr('id')).toBe('custom');
        expect(heading.attr('data-role')).toBe('section');
        expect(heading.find('a').attr('href')).toBe(`${publicPath}#custom`);
    });

    it('keeps the custom ID for common anchor buttons', () => {
        const heading = load(
            render('### Heading {#custom data-role="section"}', {useCommonAnchorButtons: true})
                .html,
        )('h3');

        expect(heading.attr('id')).toBe('custom');
        expect(heading.find('button').attr('data-href')).toBe(`${publicPath}#custom`);
    });

    it('keeps the explicit ID alongside a Github-compatible anchor', () => {
        const document = load(
            render('### Heading {#custom data-role="section"}', {supportGithubAnchors: true}).html,
        );
        const heading = document('h3');

        expect(heading.attr('id')).toBe('custom');
        expect(
            heading
                .find('a')
                .map((_index, element) => document(element).attr('href'))
                .get()
                .sort(),
        ).toEqual([`${publicPath}#custom`, `${publicPath}#heading`]);
    });

    it('preserves legacy title extraction alongside mixed section attributes', () => {
        const result = render('# Page title {#page}\n\n### Heading {#custom data-role="section"}', {
            extractTitle: true,
        });
        const heading = load(result.html)('h3');

        expect(result.title).toBe('Page title');
        expect(heading.attr('id')).toBe('custom');
        expect(heading.find('a').attr('href')).toBe(`${publicPath}#custom`);
        expect(result.headings).toEqual([
            {title: 'Heading', href: `${publicPath}#custom`, level: 3},
        ]);
    });

    it('does not render a common anchor when disabled', () => {
        const result = render('### Heading {#custom data-role="section"}', {
            disableCommonAnchors: true,
        });
        const heading = load(result.html)('h3');

        expect(heading.attr('id')).toBe('custom');
        expect(heading.find('a, button')).toHaveLength(0);
        expect(heading.text()).toBe('Heading');
        expect(result.headings[0].href).toBe(`${publicPath}#custom`);
    });
});

it('applies heading attributes after unfolding included content', () => {
    const result = transform('{% include [heading](./include-heading-attributes.md) %}', {
        plugins: [includes, anchors],
        path: mocksPath,
        root: dirname(mocksPath),
        getPublicPath: () => publicPath,
        enableMarkdownAttrs: true,
        needFlatListHeadings: true,
    }).result;
    const heading = load(result.html)('h3');

    expect(heading.attr('id')).toBe('included-heading');
    expect(heading.attr('data-role')).toBe('section');
    expect(heading.find('a').attr('href')).toBe(`${publicPath}#included-heading`);
    expect(result.headings).toEqual([
        {title: 'Included heading', href: `${publicPath}#included-heading`, level: 3},
    ]);
});
