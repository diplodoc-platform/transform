import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {afterEach, beforeAll, beforeEach, expect, test} from 'vitest';

import {resolveFromPlaygroundRoot} from '../scripts/utils.mjs';

beforeAll(() => {
    const runtime = execFileSync(
        process.execPath,
        [
            '--input-type=module',
            '--eval',
            `
                import {build} from 'esbuild';
                import {ts} from './scripts/configs.mjs';
                const result = await build({
                    ...ts(),
                    stdin: {
                        contents: \`
                            import '@local/transform-dist/js/yfm.js';
                            import '@diplodoc/transform/dist/js/base.js';
                            import '@diplodoc/transform/dist/js/_yfm-only.js';
                        \`,
                        resolveDir: process.cwd(),
                    },
                    write: false,
                    sourcemap: false,
                });
                process.stdout.write(result.outputFiles[0].text);
            `,
        ],
        {cwd: resolveFromPlaygroundRoot(), encoding: 'utf8'},
    );

    window.eval(runtime);
});

beforeEach(() => {
    document.body.innerHTML = `
        <div class="yfm">
            <i class="yfm yfm-term_title" id=":term" term-key=":term" role="button" tabindex="0">term</i>
            <dfn class="yfm yfm-term_dfn" id=":term_element" role="dialog">definition</dfn>
        </div>
    `;
});

afterEach(() => {
    document.body.innerHTML = '';
});

test('local preview and editor runtimes toggle a term once per click', () => {
    const term = document.getElementById(':term');
    const definition = document.getElementById(':term_element');
    assert.ok(term);
    assert.ok(definition);

    term.click();
    expect(definition.classList.contains('open')).toBe(true);

    term.click();
    expect(definition.classList.contains('open')).toBe(false);
});

test('local preview and editor runtimes open a term with Enter and close it with Escape', () => {
    const term = document.getElementById(':term');
    const definition = document.getElementById(':term_element');
    assert.ok(term);
    assert.ok(definition);

    term.focus();
    term.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    expect(definition.classList.contains('open')).toBe(true);

    term.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    expect(definition.classList.contains('open')).toBe(false);
    expect(document.activeElement).toBe(term);
});
