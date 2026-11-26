import MarkdownIt from 'markdown-it';

import transform from '../src/transform';
import checkbox from '../src/transform/plugins/checkbox';
import taskList from '../src/transform/plugins/task-list';
import {captureTaskRule} from '../src/transform/plugins/task-list/capture';

function parser() {
    return new MarkdownIt({html: true}).use(taskList);
}

describe('task list leaf adapter', () => {
    it.each([false, true])(
        'restores the exact after descriptor on registration success and failure (own=%s)',
        (own) => {
            const md = new MarkdownIt();
            if (own) {
                Object.defineProperty(md.core.ruler, 'after', {
                    value: md.core.ruler.after,
                    configurable: true,
                    writable: true,
                    enumerable: true,
                });
            }
            const descriptor = Object.getOwnPropertyDescriptor(md.core.ruler, 'after');
            const before = md.core.ruler.getRules('').length;
            captureTaskRule(md, (parser) =>
                parser.core.ruler.after('inline', 'task_list', () => {}),
            );
            expect(Object.getOwnPropertyDescriptor(md.core.ruler, 'after')).toEqual(descriptor);
            expect(() =>
                captureTaskRule(md, (parser) => {
                    parser.core.ruler.after('inline', 'task_list', () => {});
                    throw new Error('upstream failed');
                }),
            ).toThrow('upstream failed');
            expect(Object.getOwnPropertyDescriptor(md.core.ruler, 'after')).toEqual(descriptor);
            expect(md.core.ruler.getRules('')).toHaveLength(before);
        },
    );

    it('leaves the native inherited registration method inherited after installation', () => {
        const md = new MarkdownIt();
        const before = Object.getOwnPropertyDescriptor(md.core.ruler, 'after');
        md.use(taskList);
        expect(Object.getOwnPropertyDescriptor(md.core.ruler, 'after')).toEqual(before);
    });

    it('fails closed on changed or missing upstream registration', () => {
        const md = new MarkdownIt();
        const before = md.core.ruler.getRules('').length;
        expect(() =>
            captureTaskRule(md, (parser) => parser.core.ruler.after('inline', 'other', () => {})),
        ).toThrow('Unexpected');
        expect(() => captureTaskRule(md, () => {})).toThrow('did not register');
        expect(md.core.ruler.getRules('')).toHaveLength(before);
        expect(Object.prototype.hasOwnProperty.call(md.core.ruler, 'after')).toBe(false);
    });

    it('renders disabled implicit labels for nested, ordered and loose list items', () => {
        const html = parser().render(
            '1. [x] one [link](https://example.com)\n   - [ ] nested\n\n2. [X] two\n\n   continuation',
        );
        expect(html).toContain('<label class="yfm-task-label"><input type="checkbox"');
        expect(html).toContain('checked="checked" disabled="disabled"');
        expect(html).toContain('<a href="https://example.com">link</a></label>');
        expect(html).toContain('</label></p>\n<ul');
        expect(html).toContain('<p>continuation</p>');
        expect(html).not.toMatch(/\s(?:id|for|name|value)=/);
        expect(html.match(/disabled="disabled"/g)).toHaveLength(3);
    });

    it.each([
        '- [z] label',
        '- [x]no-space',
        '- [x]',
        '- [x] ',
        '- \\[x] label',
        '[x] label',
        '- `[x] label`',
    ])('leaves %s literal', (source) => {
        expect(parser().render(source)).not.toContain('<input');
    });

    it('keeps the legacy standalone checkbox separate when both plugins are installed', () => {
        const html = new MarkdownIt()
            .use(checkbox)
            .use(taskList)
            .render('[x] standalone\n\n- [ ] list');
        expect(html).toContain('class="checkbox"');
        expect(html).toContain('class="yfm-task-label"');
        expect(html.match(/<input/g)).toHaveLength(2);
    });

    it('accepts NBSP and retains inline markup', () => {
        const html = parser().render('- [ ]\u00a0**bold**');
        expect(html).toContain('<strong>bold</strong></label>');
    });

    it('does not leak temporary symbols into a reused env', () => {
        const md = parser();
        const env = {custom: 'retained'};
        const before = Reflect.ownKeys(env);
        const a = md.render('- [x] A', env);
        md.render('- [ ] B', env);
        expect(md.render('- [x] A', env)).toBe(a);
        expect(Reflect.ownKeys(env)).toEqual(before);
        expect(env).toEqual({custom: 'retained'});
    });

    it('restores the env and suppressed content if upstream throws', () => {
        const md = parser();
        let observedState: Parameters<Parameters<typeof md.core.ruler.before>[2]>[0] | undefined;
        md.core.ruler.before('yfm_task_list', 'break_task', (state) => {
            observedState = state;
            const candidate = state.tokens.find(
                (token) => token.type === 'inline' && token.content.startsWith('[x] valid'),
            );
            if (candidate?.children?.[0]) Object.freeze(candidate.children[0]);
        });
        const env = {marker: true};
        expect(() => md.render('- [z] ignored\n- [x] valid', env)).toThrow();
        expect(observedState?.env).toBe(env);
        expect(
            observedState?.tokens.find(
                (token) => token.type === 'inline' && token.content.startsWith('[z]'),
            )?.content,
        ).toBe('[z] ignored');
        expect(Reflect.ownKeys(env)).toEqual(['marker']);
        md.core.ruler.disable('break_task');
        expect(md.render('- [ ] clean', env)).toContain('disabled="disabled"');
    });

    it.each([false, true])(
        'works as a manual Transform callback with attrs=%s and no sanitizer bypass',
        (attrs) => {
            const result = transform('- [x] [link](https://example.com)', {
                plugins: [taskList],
                attrs,
            }).result.html;
            expect(result).toContain('<label class="yfm-task-label">');
            expect(result).toContain('disabled');
            expect(result).toContain('<a href="https://example.com">link</a>');
            expect(result).not.toMatch(/\s(?:id|for|name|value)=/);
        },
    );

    it.each([false, true])(
        'keeps generated inputs disabled with sanitization=%s',
        (needToSanitizeHtml) => {
            const html = transform('- [x] task {.enabled onclick=alert(1)}', {
                plugins: [taskList],
                attrs: true,
                needToSanitizeHtml,
            }).result.html;
            expect(html).toContain('disabled');
            expect(html).not.toMatch(/<input[^>]*(?:onclick|name|value)=/);
        },
    );

    it.each([false, true])('keeps existing raw HTML filtering with allowHTML=%s', (allowHTML) => {
        const unsafe = '<img src=x onerror=alert(1)> [bad](javascript:alert(1))';
        const options = {plugins: [taskList], allowHTML};
        const task = transform(`- [ ] ${unsafe}`, options).result.html;
        const ordinary = transform(unsafe, options).result.html;
        expect(task.includes('onerror')).toBe(ordinary.includes('onerror'));
        expect(task.includes('href="javascript:')).toBe(ordinary.includes('href="javascript:'));
    });
});
