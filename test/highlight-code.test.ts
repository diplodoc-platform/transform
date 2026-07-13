import {dirname} from 'path';

import transform from '../src/transform';

const mocksPath = require.resolve('./utils.ts');
const transformYfm = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        plugins: [],
        path: mocksPath,
        root: dirname(mocksPath),
    });
    return html;
};

// Runs the full transform pipeline WITH the default plugins (including the code
// plugin) and the real highlight.js highlighter. Unlike code.test.ts, which
// mocks the fence renderer, this exercises the real interaction between the
// prompt feature and language grammars.
const transformWithPlugins = (text: string) => {
    const {
        result: {html},
    } = transform(text, {
        path: mocksPath,
        root: dirname(mocksPath),
    });
    return html;
};

test('should highlight code', () => {
    const result = transformYfm("```ts\nconst x: string = 'y';\n```");

    expect(result).toMatchSnapshot();
});

describe('prompt with real highlighting (plan B)', () => {
    it('should not let highlight.js treat the "#" prompt as a shell comment', () => {
        const result = transformWithPlugins('```sh prompt="#"\n# apt-get update\n```');

        // The prompt symbol is stripped before highlighting, so the command is
        // NOT swallowed by an hljs-comment span. The command text stays visible.
        expect(result).toContain('<span class="yfm-code-prompt" aria-hidden="true"># </span>');
        expect(result).toContain('apt-get');
        // The prompt itself must not be turned into a comment span.
        expect(result).not.toContain('<span class="hljs-comment"># apt-get update</span>');
    });

    it('should not let highlight.js treat the "$" prompt as a shell variable', () => {
        const result = transformWithPlugins('```bash prompt="$"\n$ echo hi\n```');

        expect(result).toContain('<span class="yfm-code-prompt" aria-hidden="true">$ </span>');
        expect(result).toContain('echo');
    });

    it('should still highlight the command that follows the prompt', () => {
        const result = transformWithPlugins('```bash prompt="$"\n$ echo hi\n```');

        // The remaining command is handed to highlight.js and gets real tokens.
        expect(result).toContain('hljs-built_in');
    });

    it('should expose the raw prompt via data-prompt for the copy widget', () => {
        const result = transformWithPlugins('```sh prompt="$"\n$ ls\n```');

        expect(result).toContain('data-prompt="$"');
    });

    it('should leave output lines (without prompt) untouched', () => {
        const result = transformWithPlugins('```sh prompt="$"\n$ ls\noutput line\n```');

        expect(result).toContain('output line');
        // Output lines get no prompt span.
        expect(result).not.toContain(
            '<span class="yfm-code-prompt" aria-hidden="true">$ </span>output',
        );
    });
});
