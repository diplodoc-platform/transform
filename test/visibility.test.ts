import dedent from 'ts-dedent';
import {beforeEach, describe, expect, it} from 'vitest';

import transform from '../src/transform';
import {filterAudienceContent} from '../src/transform/plugins/visibility';
import {log} from '../src/transform/log';

const MARKDOWN = dedent`
Common content.

:::visibility agents
Agent instructions.
:::

:::visibility humans
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
});

describe('filterAudienceContent', () => {
    it('preserves common source and unwraps the selected audience', () => {
        const result = filterAudienceContent(MARKDOWN, 'agent');

        expect(result.content).toContain('Common content.');
        expect(result.content).toContain('Agent instructions.');
        expect(result.content).not.toContain('Human instructions.');
        expect(result.content).not.toContain(':::visibility');
        expect(result.audience).toEqual(['human', 'agent']);
        expect(result.originalCharacters - result.filteredCharacters).toBe(
            result.removedCharacters,
        );
    });

    it('applies nested visibility as an intersection', () => {
        const result = filterAudienceContent(
            dedent`
            :::visibility agents
            Agent content.

            :::visibility humans
            Unreachable content.
            :::
            :::
            `,
            'agent',
        );

        expect(result.content).toContain('Agent content.');
        expect(result.content).not.toContain('Unreachable content.');
        expect(result.audience).toEqual(['human', 'agent']);
    });

    it('does not interpret examples inside fenced code blocks', () => {
        const source = dedent`
        \`\`\`md
        :::visibility agents
        Example content.
        :::
        \`\`\`
        `;

        expect(filterAudienceContent(source, 'human')).toMatchObject({
            audience: [],
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
