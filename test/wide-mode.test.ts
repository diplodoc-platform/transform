// @vitest-environment jsdom

import {afterEach, describe, expect, it} from 'vitest';

import transform from '../src/transform';
import {applyWideMode} from '../src/js/wide-mode/apply';
import {modal} from '../src/js/wide-mode/modal';

function expand(markdown: string) {
    const {
        result: {html},
    } = transform(markdown, {
        allowHTML: false,
        enableMarkdownAttrs: true,
        disableLiquid: true,
    });
    return mount(html);
}

function mount(html: string) {
    document.body.innerHTML = `<div class="yfm">${html}</div>`;
    applyWideMode();

    const button = document.querySelector<HTMLElement>('.wide-content-viewer');
    if (!button) {
        throw new Error('Expected an expand button');
    }
    button.click();

    const template = window.wideTemplate;
    if (!template) {
        throw new Error('Expected the wide-mode modal');
    }
    return template;
}

afterEach(() => {
    delete window.wideTemplate;
    document.body.replaceChildren();
});

describe('wide-mode title rendering', () => {
    it('clears the previous title when the next element has no title', () => {
        const template = expand('first{wide-content title="First"}');
        modal.remove();

        const next = document.createElement('p');
        next.textContent = 'Second content';
        document.body.append(next);
        modal.render(next);

        expect(template.querySelector('.wide-entity-name')?.textContent).toBe('');
        expect(template.querySelector('.wide-content')?.textContent).toBe(next.textContent);
    });

    it.each(['Plain title', '<b>Formatted title</b>', 'Values <min> & <max>'])(
        'renders the title as literal text: %s',
        (title) => {
            const template = expand(`content{wide-content title="${title}"}`);
            const label = template.querySelector('.wide-entity-name');

            expect(label?.textContent).toBe(title);
            expect(label?.childElementCount).toBe(0);
            expect(template.querySelector('.wide-content')?.textContent).toBe('content');
        },
    );

    it('renders decoded attribute entities as literal text', () => {
        const template = mount(
            '<p wide-content title="Fish &amp; chips &lt;b&gt; &quot;quoted&quot;">content</p>',
        );
        const label = template.querySelector('.wide-entity-name');

        expect(label?.textContent).toBe('Fish & chips <b> "quoted"');
        expect(label?.childElementCount).toBe(0);
    });

    it.each(['', ' title=""'])('renders an empty title for attributes: %s', (attributes) => {
        const template = expand(`content{wide-content${attributes}}`);
        const label = template.querySelector('.wide-entity-name');

        expect(label?.textContent).toBe('');
        expect(label?.childElementCount).toBe(0);
    });

    it('reuses the modal after closing and reopening', () => {
        const template = expand('first{wide-content title="First"}');
        modal.remove();

        expect(template.style.display).toBe('none');
        expect(template.querySelector('.wide-content')?.childElementCount).toBe(0);

        const next = document.createElement('p');
        next.title = 'Second <b>title</b>';
        next.textContent = 'Second content';
        document.body.append(next);
        modal.render(next);

        expect(window.wideTemplate).toBe(template);
        expect(template.style.display).toBe('flex');
        expect(template.querySelector('.wide-entity-name')?.textContent).toBe(next.title);
        expect(template.querySelector('.wide-entity-name')?.childElementCount).toBe(0);
        expect(template.querySelector('.wide-content')?.textContent).toBe(next.textContent);
    });

    it('still clones valid term definitions into an expanded table', () => {
        const template = expand(
            [
                '[*html]: A **markup** language.',
                '',
                '| Language |',
                '| --- |',
                '| [HTML](*html) |',
                '',
                '{wide-content title="Languages"}',
            ].join('\n'),
        );
        const original = document.getElementById(':html_element');
        const cloned = template.querySelector('.wide-content .yfm-term_dfn');

        expect(original).not.toBeNull();
        expect(cloned).not.toBeNull();
        expect(cloned).not.toBe(original);
        expect(cloned?.textContent).toBe(original?.textContent);
        expect(cloned?.querySelector('strong')?.textContent).toBe('markup');
        expect(template.querySelector('.wide-content table')).not.toBeNull();
    });
});
