import MarkdownIt from 'markdown-it';
import {describe, expect, it} from 'vitest';

import table from '../../src/transform/plugins/table';

const render = (source: string) => new MarkdownIt().use(table).render(source);
const sourceTable = '#|\n|| before | after ||\n|#';

describe('content immediately following a table closer', () => {
    it.each(['Paragraph `code`', '## Heading', '- List item', '#|\n|| Second ||\n|#'])(
        'preserves %s without requiring a blank line',
        (following) => {
            expect(render(`${sourceTable}\n${following}`)).toBe(
                render(sourceTable) + render(following),
            );
        },
    );

    it.each(['', '> ', '  '])('preserves following content with prefix %j', (prefix) => {
        const source = `${sourceTable}\nFollowing paragraph`
            .split('\n')
            .map((line) => prefix + line)
            .join('\n');
        const document = prefix === '  ' ? `- Item\n\n${source}` : source;
        expect(render(document)).toContain('Following paragraph');
    });

    it('preserves outer-cell content after an adjacent nested closer', () => {
        const source = '#|\n|| outer\n\n#|\n|| nested ||\n|#\nfollowing nested\n||\n|#';
        expect(render(source)).toContain('following nested');
        expect(render(source).match(/<table>/g)).toHaveLength(2);
    });

    it('uses an exclusive table map ending immediately after its closer', () => {
        const tokens = new MarkdownIt().use(table).parse(`${sourceTable}\nFollowing`, {});
        expect(tokens.find(({type}) => type === 'yfm_table_open')?.map).toEqual([0, 3]);
        expect(tokens.find(({type}) => type === 'yfm_table_close')?.map).toEqual([2, 3]);
        expect(tokens.find(({content}) => content === 'Following')?.map).toEqual([3, 4]);
    });
});
