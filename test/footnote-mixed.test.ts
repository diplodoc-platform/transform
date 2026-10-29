import type {MarkdownIt} from '../src/transform/shared-types';

import {load} from 'cheerio';
import {describe, expect, it} from 'vitest';

import parser from '../src/transform/md';
import DefaultPlugins from '../src/transform/plugins';

const cases = {
    'note-both':
        '{% note info "Note[^a]" %}\n\nBody[^a]\n\n{% endnote %}\n\n[^a]: note definition\n\n    ## Note heading',
    'note-title-only':
        '{% note info "Note[^a]" %}\n\nBody\n\n{% endnote %}\n\n[^a]: note definition',
    'cut-both': '{% cut "Cut[^a]" %}\n\nBody[^a]\n\n{% endcut %}\n\n[^a]: cut definition',
    'cut-title-only': '{% cut "Cut[^a]" %}\n\nBody\n\n{% endcut %}\n\n[^a]: cut definition',
    tabs: '{% list tabs %}\n\n- Tab[^a]\n\n  Body[^a]\n\n- Other\n\n  Other text\n\n{% endlist %}\n\n[^a]: tab definition',
    'tabs-title-only':
        '{% list tabs %}\n\n- Tab[^a]\n\n  Body\n\n- Other\n\n  Other text\n\n{% endlist %}\n\n[^a]: tab definition',
    table: '#|\n|| Cell[^a] | Other ||\n|#\n\n[^a]: table definition',
    'ordinary-table':
        '| Cell[^a] | Other |\n| --- | --- |\n| row | value |\n\n[^a]: table definition',
    'term-body':
        'Root[^a]\n\n[^a]: root definition\n\n[API](*api)\n\n[*api]: Term[^a]\n[^a]: term definition',
    attrs: 'Text[^a] **strong**{.marked}\n\n[^a]: ## Private {#private}\n\n    Body {style="color:red;position:fixed"}',
    'super-strike': '^sup^ ~~strike[^a]~~ ++under[^a]++ H~2~O\n\n[^a]: ordinary definition',
};

function setup(enableMarkdownAttrs: boolean) {
    const counters = {parse: 0, inline: 0, generated: 0, titleRenders: 0};
    const capture = (md: MarkdownIt) => {
        const text = md.renderer.rules.text;
        md.renderer.rules.text = (tokens, index, options, env, self) => {
            if (['Note', 'Cut', 'Tab'].includes(tokens[index].content)) counters.titleRenders++;
            return text
                ? text(tokens, index, options, env, self)
                : self.renderToken(tokens, index, options);
        };
        const parse = md.parse,
            inline = md.parseInline;
        md.parse = function (source, env) {
            counters.parse++;
            return parse.call(this, source, env);
        };
        md.parseInline = function (source, env) {
            counters.inline++;
            return inline.call(this, source, env);
        };
    };
    const owned = parser({
        disableLiquid: true,
        enableMarkdownAttrs,
        generateID: () => `mixed-${++counters.generated}`,
        plugins: [...DefaultPlugins, capture],
    });
    return {owned, counters};
}

describe.each([false, true])('actual mixed footnote contexts with attrs=%s', (attrs) => {
    it.each(Object.entries(cases))(
        '%s emits no dangling references or navigation leaks',
        (name, source) => {
            const {owned, counters} = setup(attrs);
            const document = owned.parseDocument(source);
            const parsed = {...counters};
            const html = owned.compileDocument(document);
            const after = {...counters};
            expect(owned.compileDocument(document)).toBe(html);
            expect(counters).toEqual({...after, titleRenders: after.titleRenders * 2});
            const titleCount = /^(note|cut)/.test(name) ? 1 : 0;
            expect(after.titleRenders).toBe(titleCount);
            const baseline = setup(attrs);
            baseline.owned.compileDocument(
                baseline.owned.parseDocument(source.replace(/\[\^a\]/g, 'plain')),
            );
            expect(after.parse).toBe(baseline.counters.parse);
            expect(after.inline).toBe(baseline.counters.inline);
            expect(after.generated).toBe(
                baseline.counters.generated + (name === 'tabs-title-only' ? 0 : 1),
            );
            expect(counters.parse).toBe(parsed.parse);
            expect(counters.inline).toBe(parsed.inline);
            const $ = load(document.env.title + html);
            const ids = $('[id]')
                .toArray()
                .map((element) => $(element).attr('id'));
            expect(new Set(ids).size).toBe(ids.length);
            $('.footnote-ref a,.footnote-backref').each((_i, element) =>
                expect(ids).toContain($(element).attr('href')?.slice(1)),
            );
            expect(document.env.headings).toEqual([]);
            const counts: Record<string, number> = {'term-body': 2, 'tabs-title-only': 0};
            expect($('.footnote-item').length).toBe(counts[name] ?? 1);
            if (name === 'attrs') {
                expect($('.marked').length).toBe(attrs ? 1 : 0);
                expect(
                    $('[style]')
                        .toArray()
                        .some((element) =>
                            String($(element).attr('style')).includes('position:fixed'),
                        ),
                ).toBe(false);
            }
            if (name.startsWith('tabs')) {
                expect($('[role=tab]').first().text()).toBe('Tab[^a]');
                expect($('[role=tab] .footnote-ref').length).toBe(0);
                expect($('.footnote-backref').length).toBe(name === 'tabs' ? 1 : 0);
            }
        },
    );
});

describe.each([false, true])('late metadata with attrs=%s', (attrs) => {
    it.each(['admitted', 'unused', 'missing'])('only resolves admitted bodies: %s', (state) => {
        const admitted = state === 'admitted';
        let generated = 0,
            inlineCalls = 0;
        const inject = (md: MarkdownIt) => {
            md.core.ruler.after('yfm_footnote_ownership', 'synthetic-title', (core) => {
                if (core.inlineMode) return;
                inlineCalls++;
                core.tokens.unshift(...md.parseInline('Metadata[^late]', core.env).slice(0, 1));
            });
        };
        const owned = parser({
            disableLiquid: true,
            enableMarkdownAttrs: attrs,
            generateID: () => String(++generated),
            plugins: [...DefaultPlugins, inject],
        });
        const source =
            state === 'missing'
                ? 'ordinary'
                : (admitted ? 'Body[^late]\n\n' : '') + '[^late]: Local body';
        const document = owned.parseDocument(source);
        expect(generated).toBe(0);
        const html = owned.compileDocument(document);
        const $ = load(html);
        expect($('.footnote-item').length).toBe(admitted ? 1 : 0);
        expect($('.footnote-ref').length).toBe(admitted ? 2 : 0);
        expect($('.footnote-backref').length).toBe(admitted ? 2 : 0);
        expect(generated).toBe(admitted ? 1 : 0);
        expect(inlineCalls).toBe(1);
        expect(owned.compileDocument(document)).toBe(html);
        expect(inlineCalls).toBe(1);
        expect(generated).toBe(admitted ? 1 : 0);
        if (!admitted) expect(html).toContain('Metadata[^late]');
        const ids = $('[id]')
            .toArray()
            .map((element) => $(element).attr('id'));
        $('.footnote-ref a,.footnote-backref').each((_i, element) =>
            expect(ids).toContain($(element).attr('href')?.slice(1)),
        );
    });
});

describe.each([false, true])('mixed title sanitizer policy with attrs=%s', (attrs) => {
    it.each(['note', 'cut'])(
        'keeps unsafe HTML and URLs filtered in %s titles with refs',
        (kind) => {
            const title = 'Title[^a] <img src=x onerror=bad()> [bad](javascript:alert(1))';
            const opening = kind === 'note' ? `{% note info "${title}" %}` : `{% cut "${title}" %}`;
            const source = `${opening}\n\nbody[^a]\n\n{% end${kind} %}\n\n[^a]: <script>bad()</script> [bad](javascript:alert(1))`;
            const owned = parser({
                disableLiquid: true,
                enableMarkdownAttrs: attrs,
                allowHTML: true,
                generateID: () => 'safe',
            });
            const document = owned.parseDocument(source);
            const $ = load(owned.compileDocument(document));
            expect($('script,[onerror],a[href^="javascript:"]').length).toBe(0);
            expect($('.footnote-item').length).toBe(1);
            expect($('.footnote-ref').length).toBe(2);
            expect($('.footnote-backref').length).toBe(2);
            const ids = $('[id]')
                .toArray()
                .map((element) => $(element).attr('id'));
            $('.footnote-ref a,.footnote-backref').each((_i, element) =>
                expect(ids).toContain($(element).attr('href')?.slice(1)),
            );
        },
    );
});
