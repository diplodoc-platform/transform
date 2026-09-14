import {dirname, resolve} from 'node:path';
import dedent from 'ts-dedent';
import {beforeEach, describe, expect, it} from 'vitest';

import transform from '../src/transform';
import defaultPlugins from '../src/transform/plugins';
import includes from '../src/transform/plugins/includes';
import visibilityPlugin, {filterAudienceContent} from '../src/transform/plugins/visibility';
import {log} from '../src/transform/log';

const MARKDOWN = dedent`
Common content.

:::visibility agent
Agent instructions.
:::

:::visibility human
Human instructions.
:::
`;

describe('visibility', () => {
    beforeEach(() => log.clear());

    it('renders human content by default and records available audiences', () => {
        const {result} = transform(MARKDOWN);

        expect(result.html).toContain('Common content.');
        expect(result.html).toContain('Human instructions.');
        expect(result.html).not.toContain('Agent instructions.');
        expect(result.meta).toMatchObject({visibilityAudiences: ['human', 'agent']});
    });

    it('renders agent content when requested', () => {
        const {result} = transform(MARKDOWN, {contentAudience: 'agent'});

        expect(result.html).toContain('Common content.');
        expect(result.html).toContain('Agent instructions.');
        expect(result.html).not.toContain('Human instructions.');
        expect(result.meta).toMatchObject({visibilityAudiences: ['human', 'agent']});
    });

    it('preserves both audiences during a lint parse', () => {
        const {result} = transform(MARKDOWN, {
            plugins: [visibilityPlugin],
            isLintRun: true,
        } as unknown as transform.Options);

        expect(result.html).toContain('Human instructions.');
        expect(result.html).toContain('Agent instructions.');
    });

    it('reports and hides an unsupported audience', () => {
        const {result, logs} = transform(dedent`
        Common content.

        :::visibility robots
        Hidden content.
        :::
        `);

        expect(result.html).toContain('Common content.');
        expect(result.html).not.toContain('Hidden content.');
        expect(logs.error.join('\n')).toContain('Invalid visibility audience "robots"');
    });

    it.each([
        ['human', 'Human heading', 'Agent heading'],
        ['agent', 'Agent heading', 'Human heading'],
    ] as const)(
        'keeps only %s headings in the generated mini-toc and anchors',
        (contentAudience, visibleHeading, hiddenHeading) => {
            const {result} = transform(
                dedent`
                :::visibility human
                ## Human heading
                :::

                :::visibility agent
                ## Agent heading
                :::
                `,
                {contentAudience},
            );

            expect(JSON.stringify(result.headings)).toContain(visibleHeading);
            expect(JSON.stringify(result.headings)).not.toContain(hiddenHeading);
            expect(result.html).toContain(`id="${visibleHeading.toLowerCase().replace(' ', '-')}"`);
            expect(result.html).not.toContain(
                `id="${hiddenHeading.toLowerCase().replace(' ', '-')}"`,
            );
        },
    );

    it('composes with notes, cuts, and tabs in both nesting directions', () => {
        const source = dedent`
        {% note info %}

        :::visibility agent
        Agent inside note.
        :::

        {% endnote %}

        :::visibility agent
        {% note info %}

        Note inside agent visibility.

        {% endnote %}
        :::

        {% cut "Details" %}

        :::visibility agent
        Agent inside cut.
        :::

        {% endcut %}

        :::visibility agent
        {% cut "Agent details" %}

        Cut inside agent visibility.

        {% endcut %}
        :::

        {% list tabs %}
        - Tab

          :::visibility agent
          Agent inside tabs.
          :::
        {% endlist %}

        :::visibility agent
        {% list tabs %}
        - Agent tab

          Tabs inside agent visibility.
        {% endlist %}
        :::
        `;

        const human = transform(source).result.html;
        const agent = transform(source, {contentAudience: 'agent'}).result.html;
        const audienceSpecificText = [
            'Agent inside note.',
            'Note inside agent visibility.',
            'Agent inside cut.',
            'Cut inside agent visibility.',
            'Agent inside tabs.',
            'Tabs inside agent visibility.',
        ];

        audienceSpecificText.forEach((text) => {
            expect(human).not.toContain(text);
            expect(agent).toContain(text);
        });
    });

    it('composes with includes in both nesting directions', () => {
        const path = resolve(__dirname, 'visibility-entry.md');
        const source = dedent`
        {% include notitle [Visible include](./mocks/visibility-include.md) %}

        :::visibility agent
        {% include notitle [Agent include](./mocks/visibility-include.md) %}
        :::
        `;
        const options = {path, root: dirname(path), plugins: [...defaultPlugins, includes]};
        const human = transform(source, options).result.html;
        const agent = transform(source, {...options, contentAudience: 'agent'}).result.html;

        expect(human).toContain('Human content from include.');
        expect(human).not.toContain('Agent content from include.');
        expect(agent).toContain('Agent content from include.');
        expect(agent).not.toContain('Human content from include.');
    });

    it('records audiences found only in an include', () => {
        const path = resolve(__dirname, 'visibility-entry.md');
        const source = '{% include notitle [Visible include](./mocks/visibility-include.md) %}';
        const options = {path, root: dirname(path), plugins: [...defaultPlugins, includes]};

        const {result} = transform(source, options);

        expect(result.meta).toMatchObject({visibilityAudiences: ['human', 'agent']});
    });
});

describe('filterAudienceContent', () => {
    it('preserves common source and unwraps the selected audience', () => {
        const result = filterAudienceContent(MARKDOWN, 'agent');

        expect(result.content).toContain('Common content.');
        expect(result.content).toContain('Agent instructions.');
        expect(result.content).not.toContain('Human instructions.');
        expect(result.content).not.toContain(':::visibility');
        expect(result.audienceSpecificContent).toEqual(['human', 'agent']);
        expect(result.originalCharacters - result.filteredCharacters).toBe(
            result.removedCharacters,
        );
    });

    it('recognizes whitespace between the container marker and directive name', () => {
        const result = filterAudienceContent(
            dedent`
            ::: visibility agent
            Agent instructions.
            :::
            `,
            'human',
        );

        expect(result.content).not.toContain('Agent instructions.');
        expect(result.audienceSpecificContent).toEqual(['agent']);
    });

    it('applies nested visibility as an intersection', () => {
        const result = filterAudienceContent(
            dedent`
            :::visibility agent
            Agent content.

            :::visibility human
            Unreachable content.
            :::
            :::
            `,
            'agent',
        );

        expect(result.content).toContain('Agent content.');
        expect(result.content).not.toContain('Unreachable content.');
        expect(result.audienceSpecificContent).toEqual(['human', 'agent']);
    });

    it('preserves list indentation when filtering nested visibility blocks', () => {
        const result = filterAudienceContent(
            dedent`
            - Outer item
              - Nested item

                :::visibility agent
                Agent content.

                :::visibility human
                Unreachable human content.
                :::
                :::
            `,
            'agent',
        );

        expect(result.content).toContain('    Agent content.');
        expect(result.content).not.toContain('Unreachable human content.');
        expect(result.content).not.toContain(':::visibility');
    });

    it('does not interpret examples inside fenced code blocks', () => {
        const source = dedent`
        \`\`\`md
        :::visibility agent
        Example content.
        :::
        \`\`\`
        `;

        expect(filterAudienceContent(source, 'human')).toMatchObject({
            audienceSpecificContent: [],
            content: source,
        });
    });

    it('hides invalid blocks and returns their diagnostics', () => {
        const result = filterAudienceContent(
            dedent`
            Visible.

            :::visibility robots
            Hidden.
            :::
            `,
            'human',
        );

        expect(result.content).toContain('Visible.');
        expect(result.content).not.toContain('Hidden.');
        expect(result.errors).toEqual([expect.objectContaining({line: 3, value: 'robots'})]);
    });
});
