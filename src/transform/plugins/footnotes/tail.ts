/*!
 * Adapted from markdown-it-footnote 4.0.0, footnote_tail.
 * Copyright (c) 2014-2015 Vitaly Puzrin, Alex Kocharin.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {CoreInput} from './types';

type Footnote =
    | {tokens: Token[]; content: string; count?: number; label?: string}
    | {tokens?: undefined; content?: undefined; count: number; label: string};
interface Footnotes {
    list?: Footnote[];
}

/**
 * Preserve the pinned tail grammar while appending each body token only once.
 * @param state - Native core state after the pinned footnote rules ran.
 * @returns Nothing; definition tokens are moved to the ordered footnote tail.
 */
export function footnoteTail(state: CoreInput): void {
    const footnotes = state.env.footnotes as Footnotes | undefined;
    if (!footnotes) return;

    let tokens: Token[] | undefined;
    let current: Token[] = [];
    let currentLabel: string | undefined;
    let insideRef = false;
    const refTokens: Record<string, Token[]> = {};
    state.tokens = state.tokens.filter((token) => {
        if (token.type === 'footnote_reference_open') {
            insideRef = true;
            current = [];
            currentLabel = (token.meta as {label: string}).label;
            return false;
        }
        if (token.type === 'footnote_reference_close') {
            insideRef = false;
            refTokens[`:${currentLabel}`] = current;
            return false;
        }
        if (insideRef) current.push(token);
        return !insideRef;
    });

    if (!footnotes.list) return;
    const list = footnotes.list;
    state.tokens.push(new state.Token('footnote_block_open', '', 1));
    for (let index = 0, length = list.length; index < length; index++) {
        const note = list[index];
        const open = new state.Token('footnote_open', '', 1);
        open.meta = {id: index, label: note.label};
        state.tokens.push(open);

        if (note.tokens) {
            const paragraphOpen = new state.Token('paragraph_open', 'p', 1);
            paragraphOpen.block = true;
            const inline = new state.Token('inline', '', 0);
            inline.children = note.tokens;
            inline.content = note.content;
            const paragraphClose = new state.Token('paragraph_close', 'p', -1);
            paragraphClose.block = true;
            tokens = [paragraphOpen, inline, paragraphClose];
        } else if (note.label) {
            tokens = refTokens[`:${note.label}`];
        }

        // Do not concatenate the growing document or spread an unbounded body into push.
        if (tokens) {
            for (const token of tokens) state.tokens.push(token);
        }
        const lastParagraph =
            state.tokens[state.tokens.length - 1].type === 'paragraph_close'
                ? state.tokens.pop()
                : undefined;
        const count = note.count && note.count > 0 ? note.count : 1;
        for (let occurrence = 0; occurrence < count; occurrence++) {
            const anchor = new state.Token('footnote_anchor', '', 0);
            anchor.meta = {id: index, subId: occurrence, label: note.label};
            state.tokens.push(anchor);
        }
        if (lastParagraph) state.tokens.push(lastParagraph);
        state.tokens.push(new state.Token('footnote_close', '', -1));
    }
    state.tokens.push(new state.Token('footnote_block_close', '', -1));
}
