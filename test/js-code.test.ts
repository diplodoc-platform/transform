// @vitest-environment jsdom

import type * as Utils from '../src/js/utils';

import {dirname} from 'path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import transform from '../src/transform';
import {copyToClipboard} from '../src/js/utils';
// The module attaches a single global click handler on import.
import '../src/js/code';

// Mock only copyToClipboard so we can assert on the copied text and control the
// returned promise, while keeping getEventTarget/isCustom and the real markup
// from the pipeline intact.
vi.mock('../src/js/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof Utils>();
    return {
        ...actual,
        copyToClipboard: vi.fn(() => Promise.resolve()),
    };
});

const mockedCopy = vi.mocked(copyToClipboard);

const mocksPath = require.resolve('./utils.ts');

// Runs the full transform pipeline with the default plugins (code plugin
// included) and the real highlighter, returning the sanitized HTML.
function render(markdown: string, options: {codeLineWrapping?: boolean} = {}) {
    const {
        result: {html},
    } = transform(markdown, {
        path: mocksPath,
        root: dirname(mocksPath),
        ...options,
    });
    return html;
}

// Asserts that a queried element exists, narrowing the type to non-null so tests
// stay free of non-null assertions. A missing element means the plugin markup
// drifted from what the client handler expects — that should fail loudly.
function must<T>(value: T | null | undefined, name: string): T {
    if (value === null || value === undefined) {
        throw new Error(`Expected "${name}" to be present in the rendered markup`);
    }
    return value;
}

// Mounts real pipeline HTML into the jsdom document and returns handles to the
// widget elements the client handler relies on. `container`, `copyButton` and
// `code` are always produced by the plugin, so they are asserted non-null here.
// `wrapButton` is optional (only rendered with codeLineWrapping). jsdom has no
// SVG animation API, so we replace beginElement with a spy on the concrete
// <animate> element that notifySuccess() resolves via
// getElementById(`visibileAnimation-<id>`).
function mount(html: string) {
    document.body.innerHTML = html;

    const container = must(
        document.querySelector<HTMLElement>('.yfm-code-floating-container'),
        'container',
    );
    const copyButton = must(
        document.querySelector<HTMLElement>('.yfm-clipboard-button'),
        'copyButton',
    );
    const code = must(document.querySelector<HTMLElement>('pre code'), 'code');
    const wrapButton = document.querySelector<HTMLElement>('.yfm-wrapping-button');

    const animate = document.querySelector<HTMLElement>('[id^="visibileAnimation-"]');
    if (animate) {
        (animate as unknown as {beginElement: () => void}).beginElement = vi.fn();
    }

    return {container, copyButton, wrapButton, code, animate};
}

const click = (el: Element) =>
    el.dispatchEvent(new MouseEvent('click', {bubbles: true, composed: true}));

// Let the mocked promise's .then callback (notifySuccess) run.
const flush = () => Promise.resolve();

beforeEach(() => {
    vi.useFakeTimers();
    mockedCopy.mockClear();
    mockedCopy.mockResolvedValue(undefined);
});

afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
});

describe('js/code integration — real pipeline markup', () => {
    it('should expose the widget markup the client handler depends on', () => {
        // mount() asserts that container/copyButton/code exist; if the plugin
        // markup drifts from the selectors src/js/code.ts queries, this throws.
        expect(() => mount(render('```\nnpm install\n```'))).not.toThrow();
    });

    it('should render the wrapping button only when codeLineWrapping is enabled', () => {
        expect(mount(render('```\ncode\n```')).wrapButton).toBeNull();
        expect(mount(render('```\ncode\n```', {codeLineWrapping: true})).wrapButton).not.toBeNull();
    });
});

describe('js/code integration — copy button', () => {
    it('should copy the plain text content of a real rendered code block', async () => {
        const {copyButton} = mount(render('```\nnpm install\nnpm run build\n```'));

        click(copyButton);
        await flush();

        expect(mockedCopy).toHaveBeenCalledTimes(1);
        expect(mockedCopy).toHaveBeenCalledWith('npm install\nnpm run build');
    });

    it('should strip line-number decorations produced by showLineNumbers', async () => {
        const {copyButton} = mount(render('```text showLineNumbers\nline one\nline two\n```'));

        click(copyButton);
        await flush();

        // The .yfm-line-number spans injected by the plugin are removed on copy.
        expect(mockedCopy).toHaveBeenCalledWith('line one\nline two');
    });

    it('should strip the prompt prefix via the data-prompt contract', async () => {
        const {code, copyButton} = mount(
            render('```bash prompt="$"\n$ npm install\nadded 1 package\n```'),
        );

        // The pipeline must attach the raw prompt so the widget can strip it.
        expect(code.getAttribute('data-prompt')).toBe('$');

        click(copyButton);
        await flush();

        // Prompt line loses the "$ " prefix; the output line stays intact.
        expect(mockedCopy).toHaveBeenCalledWith('npm install\nadded 1 package');
    });

    it('should strip a multi-character prompt on every input line', async () => {
        const {copyButton} = mount(
            render('```python prompt=">>>"\n>>> a = 1\n>>> print(a)\n1\n```'),
        );

        click(copyButton);
        await flush();

        expect(mockedCopy).toHaveBeenCalledWith('a = 1\nprint(a)\n1');
    });

    it('should combine line numbers and prompt stripping end-to-end', async () => {
        const {copyButton} = mount(render('```bash prompt="$" showLineNumbers\n$ ls\noutput\n```'));

        click(copyButton);
        await flush();

        expect(mockedCopy).toHaveBeenCalledWith('ls\noutput');
    });

    it('should preserve leading whitespace before an indented prompt', async () => {
        const {copyButton} = mount(render('```bash prompt="$"\n  $ echo hi\n```'));

        click(copyButton);
        await flush();

        // Indentation is preserved before the prompt is removed; the final
        // single-line result is then trimmed.
        expect(mockedCopy).toHaveBeenCalledWith('echo hi');
    });

    it('should reduce a prompt-only line to its leading whitespace', async () => {
        const {copyButton} = mount(render('```bash prompt="$"\n$ first\n$\n$ second\n```'));

        click(copyButton);
        await flush();

        expect(mockedCopy).toHaveBeenCalledWith('first\n\nsecond');
    });

    it('should trim surrounding whitespace of the final text', async () => {
        const {copyButton} = mount(render('```\n\n\nnpm install\n\n\n```'));

        click(copyButton);
        await flush();

        expect(mockedCopy).toHaveBeenCalledWith('npm install');
    });

    it('should not mutate the live code block when stripping decorations', async () => {
        const {code, copyButton} = mount(
            render('```text showLineNumbers\n# comment\nnpm install\n```'),
        );

        click(copyButton);
        await flush();

        // The clone is stripped, not the live DOM produced by the pipeline.
        expect(code.querySelector('.yfm-line-number')).not.toBeNull();
    });

    it('should trigger the success animation via the visibileAnimation contract', async () => {
        const {copyButton, animate} = mount(render('```\nnpm install\n```'));

        click(copyButton);
        await flush();

        expect(
            (must(animate, 'animate') as unknown as {beginElement: () => void}).beginElement,
        ).toHaveBeenCalledTimes(1);
    });
});

describe('js/code integration — wrap button', () => {
    it('should toggle the "wrap" class on the real code element', () => {
        const {wrapButton: maybeWrapButton, code} = mount(
            render('```\nline\n```', {codeLineWrapping: true}),
        );
        const wrapButton = must(maybeWrapButton, 'wrapButton');

        click(wrapButton);
        expect(code.classList.contains('wrap')).toBe(true);
        expect(wrapButton.getAttribute('aria-pressed')).toBe('true');

        click(wrapButton);
        expect(code.classList.contains('wrap')).toBe(false);
        expect(wrapButton.getAttribute('aria-pressed')).toBe('false');
    });
});

describe('js/code integration — event guards', () => {
    it('should ignore clicks that are not on a copy or wrap button', async () => {
        const {code} = mount(render('```\nnpm install\n```'));

        click(code);
        await flush();

        expect(mockedCopy).not.toHaveBeenCalled();
    });

    it('should ignore custom events without a matchable target', async () => {
        mount(render('```\nnpm install\n```'));

        // isCustom() returns true when the target has no matches() method.
        document.dispatchEvent(new Event('click'));
        await flush();

        expect(mockedCopy).not.toHaveBeenCalled();
    });
});
