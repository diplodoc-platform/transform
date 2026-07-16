// @vitest-environment jsdom

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {closeDefinition, openClass, openDefinition} from '../src/js/term/utils';

/**
 * Builds a minimal DOM matching the structure produced by the term plugin:
 *   <div class="yfm">
 *     <i class="yfm yfm-term_title" id=":key" term-key=":key" role="button" tabindex="0">label</i>
 *     <dfn class="yfm yfm-term_dfn" id=":key_element" role="dialog">definition</dfn>
 *   </div>
 *
 * @returns {void}
 *
 * The runtime positions the definition absolutely and toggles the `open`
 * class. These tests focus on the off-screen behaviour of the closed
 * definition: after closing, inline top/left must be cleared so the CSS
 * off-screen values take effect again and the box stops extending the
 * page's scrollable area.
 */
function setupDom() {
    document.body.innerHTML = `
        <div class="yfm">
            <i class="yfm yfm-term_title" id=":term1" term-key=":term1" role="button" tabindex="0">label</i>
            <dfn class="yfm yfm-term_dfn" id=":term1_element" role="dialog">definition</dfn>
        </div>
    `;
}

function getDefinition() {
    return document.getElementById(':term1_element') as HTMLElement;
}

function getTerm() {
    return document.getElementById(':term1') as HTMLElement;
}

describe('term runtime — closeDefinition off-screen reset', () => {
    beforeEach(() => {
        setupDom();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('removes the open class on close', () => {
        const definition = getDefinition();

        definition.classList.add(openClass);
        closeDefinition(definition);

        expect(definition.classList.contains(openClass)).toBe(false);
    });

    it('clears inline top/left set during opening so the CSS off-screen position is restored', () => {
        const definition = getDefinition();

        // Simulate what setDefinitionPosition() does while the definition is open.
        definition.style.top = '200px';
        definition.style.left = '150px';
        definition.setAttribute('relativeX', '10');
        definition.setAttribute('relativeY', '20');
        definition.classList.add(openClass);

        closeDefinition(definition);

        expect(definition.style.top).toBe('');
        expect(definition.style.left).toBe('');
        expect(definition.hasAttribute('relativeX')).toBe(false);
        expect(definition.hasAttribute('relativeY')).toBe(false);
    });

    it('does not throw when the definition has no associated term', () => {
        const definition = getDefinition();

        // No term-id attribute -> getTermByDefinition returns null.
        definition.classList.add(openClass);

        expect(() => closeDefinition(definition)).not.toThrow();
        expect(definition.classList.contains(openClass)).toBe(false);
        expect(definition.style.top).toBe('');
        expect(definition.style.left).toBe('');
    });
});

/**
 * jsdom does not perform layout, so getBoundingClientRect() returns zeros for
 * every element. setDefinitionPosition() has an early return when the term's
 * coordinates match the previously stored relativeX/relativeY, so with all
 * zeros it would bail out before writing inline top/left. We stub the rect of
 * the term (and its parent) with non-zero values so positioning actually runs.
 *
 * @returns {void}
 */
function stubRects(): void {
    const termRect = {
        x: 100,
        y: 200,
        right: 150,
        left: 100,
        width: 50,
        height: 20,
        top: 200,
        bottom: 220,
        toJSON: () => termRect,
    };
    const parentRect = {
        x: 0,
        y: 0,
        right: 1000,
        left: 0,
        width: 1000,
        height: 800,
        top: 0,
        bottom: 800,
        toJSON: () => parentRect,
    };
    const defRect = {
        x: 0,
        y: 0,
        right: 300,
        left: 0,
        width: 300,
        height: 100,
        top: 0,
        bottom: 100,
        toJSON: () => defRect,
    };

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement,
    ) {
        if (this.classList.contains('yfm-term_title')) {
            return termRect;
        }
        if (this.classList.contains('yfm-term_dfn')) {
            return defRect;
        }
        return parentRect;
    });

    // getCoords() reads scroll offsets and client sizes; keep them stable.
    Object.defineProperty(document.documentElement, 'clientWidth', {
        value: 1000,
        configurable: true,
    });
    Object.defineProperty(document.body, 'clientWidth', {value: 1000, configurable: true});
}

describe('term runtime — openDefinition', () => {
    beforeEach(() => {
        setupDom();
        stubRects();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('toggles the open class and sets inline coordinates on the definition', () => {
        const term = getTerm();
        const definition = getDefinition();

        openDefinition(term);

        expect(definition.classList.contains(openClass)).toBe(true);
        // Inline coordinates are written as strings ending with 'px'.
        expect(definition.style.top).toMatch(/px$/);
        expect(definition.style.left).toMatch(/px$/);
    });

    it('closing after opening clears inline coordinates (off-screen restored)', () => {
        const term = getTerm();
        const definition = getDefinition();

        openDefinition(term);
        expect(definition.style.top).not.toBe('');

        closeDefinition(definition);

        expect(definition.classList.contains(openClass)).toBe(false);
        expect(definition.style.top).toBe('');
        expect(definition.style.left).toBe('');
    });

    it('opening the same term again repositions the definition', () => {
        const term = getTerm();
        const definition = getDefinition();

        openDefinition(term);
        const firstTop = definition.style.top;
        expect(firstTop).toMatch(/px$/);

        closeDefinition(definition);
        expect(definition.style.top).toBe('');

        openDefinition(term);
        expect(definition.classList.contains(openClass)).toBe(true);
        // Coordinates are set again after a close (off-screen reset cleared them).
        expect(definition.style.top).toMatch(/px$/);
        expect(definition.style.top).toBe(firstTop);
    });
});
