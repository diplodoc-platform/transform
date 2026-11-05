import type {MarkdownIt as MarkdownItType} from 'markdown-it' with {'resolution-mode': 'import'};

import {load} from 'cheerio';
import MarkdownIt from 'markdown-it';
import {vi} from 'vitest';

import parser from '../src/transform/md';
import transform from '../src/transform';
import defaultPlugins from '../src/transform/plugins';
import checkbox from '../src/transform/plugins/checkbox';
import taskList from '../src/transform/plugins/task-list';
import {defineLegacyPlugin} from '../src/transform/plugin-core';
import {footnoteTail} from '../src/transform/plugins/footnotes/tail';

const upstream = require('markdown-it-footnote') as (md: MarkdownItType) => void;

function nativeParser(patched: boolean) {
    const md = new MarkdownIt().use(upstream);
    if (patched) md.core.ruler.at('footnote_tail', footnoteTail);
    return md;
}

test('explicit task-list removal preserves legacy checkbox list markup', () => {
    const source = '- [x] Complete\n- [ ] Pending';
    const both = transform(source, {disableLiquid: true, plugins: [...defaultPlugins, checkbox]});
    expect(both.result.html).toContain('class="yfm-task-label"');
    const callbacks = transform(source, {
        disableLiquid: true,
        plugins: [...defaultPlugins.filter((plugin) => plugin !== taskList), checkbox],
    });
    const configured = transform(source, {
        disableLiquid: true,
        pluginConfiguration: {
            disable: ['task-list'],
            plugins: [defineLegacyPlugin({id: 'custom/checkbox', plugin: checkbox})({})],
        },
    });
    expect(configured.result.html).toBe(callbacks.result.html);
    expect(callbacks.result.html).toContain('class="checkbox"');
    expect(callbacks.result.html).not.toContain('task-list-item');
    const $ = load(callbacks.result.html);
    expect(
        $('input')
            .toArray()
            .map((input) => $(input).attr('id')),
    ).toEqual(['checkbox0', 'checkbox1']);
});

describe('Rendered footnote reference ordinals', () => {
    it.each([
        ['{% cut "Title[^a]" %}', '{% endcut %}'],
        ['{% note info "Title[^a]" %}', '{% endnote %}'],
        [':::cut [Title[^a]]', ':::'],
        [':::note [Title[^a]] {type=info}', ':::'],
    ])('counts only rendered title references in %s', (open, close) => {
        for (const bodyRef of [false, true]) {
            // Notes currently parse colon titles late: only already-admitted bodies are available.
            if (open.startsWith(':::note') && !bodyRef) continue;
            const md = parser({disableLiquid: true, generateID: () => 'ordinal'});
            const document = md.parseDocument(
                `${open}\n\nBody${bodyRef ? '[^a]' : ''}\n\n${close}\n\n[^a]: Explanation`,
            );
            const html = md.compileDocument(document);
            const $ = load(html);
            const refs = $('.footnote-ref a').toArray();
            const backrefs = $('.footnote-backref').toArray();
            expect(refs).toHaveLength(bodyRef ? 2 : 1);
            expect(backrefs).toHaveLength(refs.length);
            refs.forEach((ref, index) => {
                expect($(ref).attr('id')).toMatch(new RegExp(`-r${index + 1}$`));
                expect($(backrefs[index]).attr('href')).toBe(`#${$(ref).attr('id')}`);
                expect($(backrefs[index]).text()).toBe(`Назад к ссылке 1:${index + 1}`);
                expect($(`[id="${$(ref).attr('href')?.slice(1)}"]`)).toHaveLength(1);
            });
            const other = md.parseDocument('Other[^x]\n\n[^x]: Other note');
            md.compileDocument(other);
            expect(md.compileDocument(document)).toBe(html);
        }
    });
});

describe('Pinned footnote tail compatibility and work', () => {
    it.each([
        'Plain paragraph',
        'Missing[^missing]',
        '[^unused]: Unused definition',
        'First[^a] and again[^a].\n\n[^a]: One paragraph',
        'Text[^a]\n\n[^a]: First\n\n    Second\n\n    - nested item',
        'Text[^a]\n\n[^a]: First\n\n[^a]: Duplicate',
        'Text[^a]\n\n[^a]:',
        'Inline ^[one *note*] and ^[second note]',
        'Inline ^[first] and reference[^a]\n\n[^a]: Reference body',
        'Text[^constructor]\n\n[^constructor]: Safe label',
        '[^a]: Defined before\n\nText[^a]',
        'Text[^a]\n\n[^a]: Ref to another[^b]\n\n[^b]: Second',
        '> Text[^a]\n>\n> [^a]: In quote',
        '- Text[^a]\n\n  [^a]: In list',
        'Text[^a]\n\n[^a]: ```js\n    code\n    ```',
    ])('preserves exact upstream tokens, environment and HTML: %s', (source) => {
        const old = nativeParser(false);
        const candidate = nativeParser(true);
        const oldEnv = {};
        const newEnv = {};
        const oldTokens = old.parse(source, oldEnv);
        const newTokens = candidate.parse(source, newEnv);
        expect(newTokens).toEqual(oldTokens);
        expect(newEnv).toEqual(oldEnv);
        expect(candidate.renderer.render(newTokens, candidate.options, newEnv)).toBe(
            old.renderer.render(oldTokens, old.options, oldEnv),
        );
    });

    it('removes growing-document concatenation, with the pinned tail as a failing control', () => {
        const copied = (size: number, patched: boolean) => {
            const md = nativeParser(patched);
            const source = Array.from(
                {length: size},
                (_, index) => `Paragraph[^n${index}]\n\n[^n${index}]: Note ${index}.`,
            ).join('\n\n');
            let slots = 0;
            const original = Array.prototype.concat;
            const spy = vi.spyOn(Array.prototype, 'concat').mockImplementation(function (
                this: unknown[],
                ...items: unknown[]
            ) {
                const first = this[0];
                if (first && typeof first === 'object' && 'type' in first) {
                    slots += this.length;
                    for (const item of items) if (Array.isArray(item)) slots += item.length;
                }
                return Reflect.apply(original, this, items);
            });
            try {
                expect(md.parse(source, {})).toHaveLength(size * 9 + 2);
            } finally {
                spy.mockRestore();
            }
            return slots;
        };
        const baseline = [64, 128, 256].map((size) => copied(size, false));
        expect(baseline[1]).toBeGreaterThan(baseline[0] * 3.8);
        expect(baseline[2]).toBeGreaterThan(baseline[1] * 3.8);
        for (const size of [64, 128, 256]) expect(copied(size, true)).toBe(0);
    });
});
