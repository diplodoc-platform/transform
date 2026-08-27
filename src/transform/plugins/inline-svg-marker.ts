import type StateBlock from 'markdown-it/lib/rules_block/state_block';
import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline';
import type {MarkdownItPluginCb} from './typings';

const MARKER = /^<!--[ \t]*diplodoc:svg[ \t][^\r\n]*?-->(?=<svg\b)/;
const TOKEN_NAME = 'inline_svg_marker';

type MarkerRange = {start: number; end: number};

const inlineSvgMarker: MarkdownItPluginCb = (md) => {
    md.block.ruler.before(
        'html_block',
        TOKEN_NAME,
        (state: StateBlock, startLine: number) => {
            const start = state.bMarks[startLine] + state.tShift[startLine];
            const content = state.src.slice(start, state.eMarks[startLine]);
            const marker = MARKER.exec(content)?.[0];

            if (marker) {
                const src =
                    state.src.slice(0, start) +
                    ' '.repeat(marker.length) +
                    state.src.slice(start + marker.length);

                state.src = src;
            }

            return false;
        },
        {alt: ['paragraph', 'reference', 'blockquote']},
    );

    md.inline.ruler.before('html_inline', TOKEN_NAME, (state: StateInline) => {
        const content = state.src.slice(state.pos);
        const marker = MARKER.exec(content)?.[0];

        if (!marker) {
            return false;
        }

        const token = state.push(TOKEN_NAME, '', 0);

        token.meta = {
            start: state.pos,
            end: state.pos + marker.length,
        } satisfies MarkerRange;
        state.pos += marker.length;

        return true;
    });

    md.core.ruler.after('inline', `${TOKEN_NAME}_cleanup`, (state: StateCore) => {
        state.tokens.forEach((token) => {
            if (token.type !== 'inline' || !token.children) {
                return;
            }

            for (let index = token.children.length - 1; index >= 0; index--) {
                const marker = token.children[index];

                if (marker.type !== TOKEN_NAME) {
                    continue;
                }

                const {start, end} = marker.meta as MarkerRange;

                token.content = token.content.slice(0, start) + token.content.slice(end);
                token.children.splice(index, 1);
            }
        });
    });
};

export = inlineSvgMarker;
