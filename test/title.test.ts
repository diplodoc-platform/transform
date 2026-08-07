import transform from '../src/transform';

describe('title extraction', () => {
    it('extracts a title after a leading HTML comment', () => {
        const {result} = transform('<!-- page metadata -->\n\n# Page title\n\nContent', {
            extractTitle: true,
            allowHTML: true,
        });

        expect(result.title).toBe('Page title');
        expect(result.html).not.toContain('<h1>');
        expect(result.html).toContain('<p>Content</p>');
    });

    it('extracts a title after multiple multiline HTML comments', () => {
        const {result} = transform(
            '<!-- first\ncomment -->\n<!-- second comment -->\n# Page title\n\nContent',
            {needTitle: true, allowHTML: true},
        );

        expect(result.title).toBe('Page title');
        expect(result.html).toContain('Page title</h1>');
    });

    it('does not extract a title after visible content', () => {
        const {result} = transform('Introduction\n\n# Page title', {extractTitle: true});

        expect(result.title).toBe('');
        expect(result.html).toContain('<h1>Page title</h1>');
    });

    it('treats comment syntax as visible content when HTML is disabled', () => {
        const {result} = transform('<!-- visible text -->\n\n# Page title', {needTitle: true});

        expect(result.title).toBe('');
        expect(result.html).toContain('&lt;!-- visible text --&gt;');
    });
});
