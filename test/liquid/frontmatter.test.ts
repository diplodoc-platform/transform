import dedent from 'ts-dedent';

import {emplaceFrontMatter, separateAndExtractFrontMatter} from '../../src/transform/frontmatter';
import liquidDocument from '../../src/transform/liquid';

describe('front matter extract/emplace utility function pair', () => {
    it.each([
        dedent`
        ---
        prop: value
        ---
        # Content.
        `,
        dedent`
        ---
        prop: value
        ---

        # Content.
        `,
        dedent`
        ---
        prop: value
        ---





        # Content.
        `,
        dedent`
        # Content.
        `,
        dedent`



        
        # Content.
        `,
    ])(
        `preserves the same amount of linebreaks between front matter block and content %#`,
        (input) => {
            const {frontMatter, frontMatterStrippedContent} = separateAndExtractFrontMatter(input);
            const emplaced = emplaceFrontMatter(frontMatterStrippedContent, frontMatter);

            expect(emplaced).toEqual(input);
        },
    );

    it('is able to handle YAML with unquoted substitution syntax', () => {
        const content = dedent`
        ---
        prop: {{ wouldbreak }}
        note: This snippet typically shouldn't be able to get parsed, since {} is object syntax in YAML.
        ---

        Test.
        `;

        const {frontMatter} = separateAndExtractFrontMatter(content);

        expect(frontMatter).toMatchObject({prop: '{{ wouldbreak }}'});
    });
});

describe('Liquid substitutions in front matter (formerly metadata)', () => {
    it('work as intended when substituded with an empty string', () => {
        const content = dedent`
            ---
            verbatim: {{ var }}
            quotedSingle: '{{ var }}'
            quotedDouble: "{{ var }}"
            ---

            # Some content.
        `;

        const liquidProcessed = liquidDocument(content, {var: ''}, 'frontmatter.test.ts.md');

        const {frontMatter} = separateAndExtractFrontMatter(liquidProcessed);

        expect(frontMatter).toEqual({
            verbatim: '',
            quotedSingle: '',
            quotedDouble: '',
        });
    });

    it.each([
        {
            description: 'single quotes',
            content: dedent`
            ---
            quotes: '{{ withQuotes }}'
            ---
            Content
            `,
            vars: {withQuotes: "This isn't your typical substitution. It has single quotes."},
        },
        {
            description: 'double quotes',
            content: dedent`
            ---
            quotes: "{{ withQuotes }}"
            ---
            Content
            `,
            vars: {
                withQuotes: `"When you arise in the morning, think of what a precious privilege it is to be alive - to breathe, to think, to enjoy, to love." — Marcus Aurelius (allegedly)`,
            },
        },
        {
            description: 'curly braces',
            content: dedent`
            ---
            braces: {{ braces }}
            ---
            Content
            `,
            vars: {braces: '{}'},
        },
        {
            description: 'square brackets',
            content: dedent`
            ---
            brackets: {{ brackets }}
            ---
            Content
            `,
            vars: {brackets: '[]'},
        },
        {
            description: 'YAML multiline syntax',
            content: dedent`
            ---
            multiline: {{ multiline }}
            ---
            Content
            `,
            vars: {multiline: '>- This should break, right?\n\tRight?'},
        },
    ])(
        'should not fail even when variables contain reserved characters ($description)',
        ({content, vars}) => {
            const liquidProcessed = liquidDocument(content, vars, 'frontmatter.test.ts.md');

            expect(liquidProcessed).toMatchSnapshot();
        },
    );
});
