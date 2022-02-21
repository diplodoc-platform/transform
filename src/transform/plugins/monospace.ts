import StateInline, {Delimiter} from 'markdown-it/lib/rules_inline/state_inline';
import {MarkdownItPluginCb} from './typings';

const monospace: MarkdownItPluginCb = (md) => {
    function postProcess(state: StateInline, delimiters: Delimiter[]) {
        let token;
        const loneMarkers = [];

        for (let i = 0; i < delimiters.length; i++) {
            const startDelim = delimiters[i];

            if (startDelim.marker !== 0x23 /* # */) {
                continue;
            }

            if (startDelim.end === -1) {
                continue;
            }

            const endDelim = delimiters[startDelim.end];

            token = state.tokens[startDelim.token];
            token.type = 'monospace_open';
            token.tag = 'samp';
            token.nesting = 1;
            token.markup = '##';
            token.content = '';

            token = state.tokens[endDelim.token];
            token.type = 'monospace_close';
            token.tag = 'samp';
            token.nesting = -1;
            token.markup = '##';
            token.content = '';

            if (
                state.tokens[endDelim.token - 1].type === 'text' &&
                state.tokens[endDelim.token - 1].content === '#'
            ) {
                loneMarkers.push(endDelim.token - 1);
            }
        }

        // If a marker sequence has an odd number of characters, it's splitted
        // like this: `#####` -> `#` + `##` + `##`, leaving one marker at the
        // start of the sequence.
        //
        // So, we have to move all those markers after subsequent s_close tags.
        //
        while (loneMarkers.length) {
            const currentMarker = loneMarkers.pop();
            if (typeof currentMarker === 'number') {
                let nextMarker = currentMarker + 1;

                while (
                    nextMarker < state.tokens.length &&
                    state.tokens[nextMarker].type === 'monospace_close'
                ) {
                    nextMarker++;
                }

                nextMarker--;

                if (currentMarker !== nextMarker) {
                    token = state.tokens[nextMarker];
                    state.tokens[nextMarker] = state.tokens[currentMarker];
                    state.tokens[currentMarker] = token;
                }
            }
        }
    }

    md.inline.ruler.before('emphasis', 'monospace', (state, silent) => {
        let token;
        const start = state.pos;
        const marker = state.src.charCodeAt(start);

        if (silent) {
            return false;
        }

        if (marker !== 0x23 /* # */) {
            return false;
        }

        const scanned = state.scanDelims(state.pos, true);
        let len = scanned.length;
        const ch = String.fromCharCode(marker);

        if (len < 2) {
            return false;
        }

        if (len % 2) {
            token = state.push('text', '', 0);
            token.content = ch;
            len--;
        }

        for (let i = 0; i < len; i += 2) {
            token = state.push('text', '', 0);
            token.content = ch + ch;

            if (!scanned.can_open && !scanned.can_close) {
                continue;
            }

            state.delimiters.push({
                marker: marker,
                length: 0, // disable "rule of 3" length checks meant for emphasis
                jump: i / 2, // 1 delimiter = 2 characters
                token: state.tokens.length - 1,
                end: -1,
                open: scanned.can_open,
                close: scanned.can_close,
            });
        }

        state.pos += scanned.length;

        return true;
    });

    md.inline.ruler2.before('emphasis', 'monospace', (state) => {
        const tokensMeta = state.tokens_meta;
        const max = (state.tokens_meta || []).length;

        postProcess(state, state.delimiters);

        for (let curr = 0; curr < max; curr++) {
            const currentToken = tokensMeta[curr];
            if (currentToken && currentToken.delimiters) {
                postProcess(state, currentToken.delimiters);
            }
        }

        return true;
    });
};

export = monospace;
