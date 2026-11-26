import {load} from 'js-yaml';

/** Only the native MarkdownIt 13/15 block-rule boundary used by this writer. */
export interface MetaParser {
    core: {
        ruler: {
            before(
                before: string,
                name: string,
                rule: (state: {env: Record<string, unknown>}) => void,
            ): void;
        };
    };
    block: {
        ruler: {
            before(
                before: string,
                name: string,
                rule: (state: MetaState, start: number, end: number) => boolean,
                options: {alt: string[]},
            ): void;
        };
    };
}

interface MetaState {
    src: string;
    bMarks: number[];
    eMarks: number[];
    tShift: number[];
    blkIndent: number;
    line: number;
    env: Record<string, unknown>;
}

const SEP = '---';

/**
 * Register YAML frontmatter rules that write to the supplied document environment.
 * @param md - Minimal core/block rule boundary implemented by native MarkdownIt 13 and 15.
 * @returns No value; the parser receives the environment-aware metadata rules.
 */
export function envMeta(md: MetaParser): void {
    md.core.ruler.before('block', 'document-meta', (state) => {
        state.env.meta ??= {};
    });

    const getLine = (state: MetaState, line: number) =>
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

            state.env.meta = data as Record<string, unknown>;
            state.line = line + 1;
            return true;
        },
        {alt: []},
    );
}
