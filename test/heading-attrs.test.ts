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
