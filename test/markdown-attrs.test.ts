import {load} from 'cheerio';
import {describe, expect, it} from 'vitest';

import transform from '../src/transform';

describe.each([false, true])(
    'Markdown table attribute compatibility (following attrs=%s)',
    (followingAttrs) => {
        it.each(['Path \\', 'Path \\\\', 'Path \\\\\\', 'C:\\tools\\new', 'Table title'])(
            'preserves literal backslashes in the title: %s',
            (title) => {
                const width = followingAttrs ? ' width="100%"' : '';
                const source = `| A |\n| --- |\n| B |\n\n{wide-content title="${title}"${width}}`;
                const table = load(transform(source).result.html)('table');

                expect(table.attr('title')).toBe(title);
                expect(table.attr('width')).toBe(followingAttrs ? '100%' : undefined);
                expect(table.attr('wide-content')).toBe('');
                expect(table.find('td').text()).toBe('B');
            },
        );
    },
);
