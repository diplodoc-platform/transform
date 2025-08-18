import type {MarkdownItPluginCb} from './typings';

import {load} from 'js-yaml';

/* eslint-disable @typescript-eslint/no-explicit-any */

const SEP = '---';

const meta: MarkdownItPluginCb = (md) => {
    const mdAny = md as any;
    mdAny.meta = mdAny.meta || {};

    const getLine = (state: any, line: number) =>
        state.src.slice(state.bMarks[line], state.eMarks[line]);

    md.block.ruler.before(
        'code',
        'meta',
        (state, startLine, endLine) => {
            if (startLine !== 0 || state.blkIndent !== 0) {
                return false;
            }
            if (state.tShift[startLine] < 0) {
                return false;
            }
            if (getLine(state, startLine).trim() !== SEP) {
                return false;
            }

            let line = startLine + 1;
            const lines: string[] = [];
            let found = false;

            while (line < endLine) {
                const str = getLine(state, line);
                if (str.trim() === SEP) {
                    found = true;
                    break;
                }
                if (state.tShift[line] < 0) {
                    return false;
                }
                lines.push(str);
                line++;
            }

            if (!found) {
                return false;
            }

            let data: unknown;
            try {
                data = load(lines.join('\n')) || {};
            } catch {
                return false;
            }

            if (typeof data !== 'object' || data === null || Array.isArray(data)) {
                return false;
            }

            mdAny.meta = data as Record<string, unknown>;
            state.line = line + 1;
            return true;
        },
        {alt: []},
    );
};

export = meta;
