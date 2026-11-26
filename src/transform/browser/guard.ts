import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {MarkdownIt, ParserEnv} from '../shared-types';
import type {BrowserSourceLocation, BrowserUnsupportedFeature} from './errors';

import {createIncludeRegExp} from '../plugins/includes/syntax';

import {BrowserUnsupportedFeatureError} from './errors';

interface Scope {
    source: string;
    lines: string[];
    starts: number[];
    protectedHtml: ReturnType<typeof createHtmlProtection>;
    htmlClosers: ReturnType<typeof indexHtmlClosers>;
}

interface Origin {
    scope: Scope;
    content: string;
    positions: {line: number; column: number}[];
    starts: number[];
    lines: string[];
    firstContent: number[];
    offsets?: number[];
}

/**
 * Index independent unquoted/single/double-quoted suffix scans in bounded work.
 * @param source - Original normalized source; native inline rules select encounters.
 * @returns Closing offsets for tag-like and comment candidates at each less-than.
 */
export function indexHtmlClosers(source: string) {
    const tags = new Map<number, number>();
    const comments = new Map<number, number>();
    if (!source.includes('<')) return {tags, comments};
    let unquoted = 0;
    let single = 0;
    let double = 0;
    let comment = source.length;
    let laterComment = source.length;
    for (let index = source.length - 1; index >= 0; index--) {
        const char = source[index];
        const nextUnquoted = unquoted;
        if (char === "'") {
            unquoted = single;
            single = nextUnquoted;
        } else if (char === '"') {
            unquoted = double;
            double = nextUnquoted;
        } else if (char === '>') {
            unquoted = index + 1;
        }
        if (char === '-' && source[index + 1] === '-' && source[index + 2] === '>') {
            laterComment = comment;
            comment = index + 3;
        }
        if (char === '<') {
            if (unquoted) tags.set(index, unquoted);
            // The old comment search starts after all four opener characters.
            comments.set(index, comment - 3 < index + 4 ? laterComment : comment);
        }
    }
    return {tags, comments};
}

/**
 * Track encountered ranges without assuming native inline traversal order.
 * @param starts - Sorted possible starts from the source's less-than offsets.
 * @returns Point activation and end-exclusive containment in O(log M) work.
 */
export function createHtmlProtection(starts: number[]) {
    const maximum = new Array<number>(starts.length + 1).fill(0);
    const countThrough = (offset: number) => {
        let begin = 0;
        let end = starts.length;
        while (begin < end) {
            const middle = Math.floor((begin + end) / 2);
            if (starts[middle] <= offset) begin = middle + 1;
            else end = middle;
        }
        return begin;
    };
    return {
        add(start: number, end: number) {
            let index = countThrough(start);
            if (starts[index - 1] !== start) throw new RangeError('Unknown HTML range start');
            while (index < maximum.length) {
                maximum[index] = Math.max(maximum[index], end);
                // eslint-disable-next-line no-bitwise -- Fenwick point-update step.
                index += index & -index;
            }
        },
        contains(offset: number) {
            let index = countThrough(offset);
            let end = 0;
            // A range contains offset iff the maximum activated end with start <= offset exceeds it.
            while (index > 0) {
                end = Math.max(end, maximum[index]);
                // eslint-disable-next-line no-bitwise -- Fenwick prefix-query step.
                index -= index & -index;
            }
            return offset < end;
        },
    };
}

function createScope(source: string): Scope {
    const lines = source.split('\n');
    let offset = 0;
    const starts = lines.map((line) => {
        const start = offset;
        offset += line.length + 1;
        return start;
    });
    const htmlClosers = indexHtmlClosers(source);
    return {
        source,
        lines,
        starts,
        protectedHtml: createHtmlProtection([...htmlClosers.comments.keys()].reverse()),
        htmlClosers,
    };
}

function contentLine(origin: Origin, offset: number): number {
    let first = 0;
    let end = origin.starts.length;
    while (first + 1 < end) {
        const middle = Math.floor((first + end) / 2);
        if (origin.starts[middle] <= offset) {
            first = middle;
        } else {
            end = middle;
        }
    }
    return first;
}

function sourcePosition(origin: Origin, offset: number) {
    const original = origin.offsets?.[offset];
    if (original !== undefined) {
        let line = 0;
        let end = origin.scope.starts.length;
        while (line + 1 < end) {
            const middle = Math.floor((line + end) / 2);
            if (origin.scope.starts[middle] <= original) line = middle;
            else end = middle;
        }
        return {line, column: original - origin.scope.starts[line]};
    }
    const line = contentLine(origin, offset);
    const position = origin.positions[line];
    return {line: position.line, column: position.column + offset - origin.starts[line]};
}

function originalOffset(origin: Origin, offset: number) {
    const position = sourcePosition(origin, offset);
    return origin.scope.starts[position.line] + position.column;
}

function location(origin: Origin, offset: number, env: ParserEnv): BrowserSourceLocation {
    const position = sourcePosition(origin, offset);
    return {
        path: typeof env.path === 'string' && env.path.trim() ? env.path : '<input>',
        line: position.line + 1,
        column: position.column + 1,
    };
}

function protectHtml(origin: Origin, offset: number): void {
    const start = originalOffset(origin, offset);
    const {source} = origin.scope;
    if (source.startsWith('<!--', start)) {
        origin.scope.protectedHtml.add(
            start,
            origin.scope.htmlClosers.comments.get(start) ?? source.length,
        );
        return;
    }
    // A sticky expression avoids allocating/testing the remaining source at every '<'.
    const tag = /<\/?[A-Za-z][A-Za-z0-9-]*(?=[\s/>])/y;
    tag.lastIndex = start;
    const end = origin.scope.htmlClosers.tags.get(start);
    if (end !== undefined && tag.test(source)) {
        origin.scope.protectedHtml.add(start, end);
    }
}

interface NativeCell {
    content: string;
    offsets: number[];
}

function nativeCells(scope: Scope, line: number, parents: Token[]): NativeCell[] {
    const raw = scope.lines[line] ?? '';
    let begin = 0;
    for (const parent of parents) {
        if (parent.type === 'blockquote_open') {
            const prefix = /^\s*>[ \t]?/.exec(raw.slice(begin));
            if (prefix) begin += prefix[0].length;
        } else if (parent.type === 'list_item_open' && parent.map?.[0] === line) {
            const prefix = /^\s*(?:[-+*]|[0-9]+[.)])[ \t]+/.exec(raw.slice(begin));
            if (prefix) begin += prefix[0].length;
        }
    }
    while (begin < raw.length && /\s/.test(raw[begin])) begin++;
    let end = raw.length;
    while (end > begin && /\s/.test(raw[end - 1])) end--;
    const cells: NativeCell[] = [];
    let characters: string[] = [];
    let offsets: number[] = [];
    const push = () => {
        const content = characters.join('');
        const trimmed = content.trim();
        const leading = content.length - content.trimStart().length;
        cells.push({content: trimmed, offsets: offsets.slice(leading, leading + trimmed.length)});
        characters = [];
        offsets = [];
    };
    // Match markdown-it's escapedSplit, including its immediate-backslash rule.
    for (let index = begin; index < end; index++) {
        const char = raw[index];
        if (char === '|') {
            if (index > begin && raw[index - 1] === '\\') {
                characters.pop();
                offsets.pop();
            } else {
                push();
                continue;
            }
        }
        characters.push(char);
        offsets.push(scope.starts[line] + index);
    }
    push();
    if (raw[begin] === '|') cells.shift();
    if (raw[end - 1] === '|' && raw[end - 2] !== '\\') cells.pop();
    return cells;
}

function mapOrigins(tokens: Token[], scope: Scope, origins: WeakMap<Token[], Origin>): void {
    const columns = new Map<number, number>();
    const parents: Token[] = [];
    let row: {line: number; cells: NativeCell[]; index: number} | undefined;
    for (const token of tokens) {
        if (token.nesting === -1) parents.pop();
        if (token.type === 'tr_open' && token.map) {
            row = {line: token.map[0], cells: nativeCells(scope, token.map[0], parents), index: 0};
        } else if (token.type === 'tr_close') {
            row = undefined;
        }
        if (token.nesting === 1) parents.push(token);
        if (token.type !== 'inline' || !token.children) {
            continue;
        }
        const cell = !token.map && row ? row.cells[row.index++] : undefined;
        const first = token.map?.[0] ?? row?.line ?? 0;
        const lines = token.content.split('\n');
        let offset = 0;
        const starts = lines.map((line) => {
            const start = offset;
            offset += line.length + 1;
            return start;
        });
        const positions = lines.map((content, index) => {
            const line = first + index;
            if (cell?.content === token.content) {
                return {line, column: (cell.offsets[0] ?? scope.starts[line]) - scope.starts[line]};
            }
            const raw = scope.lines[line] ?? '';
            const found = raw.indexOf(content, columns.get(line) ?? 0);
            const column = Math.max(found, 0);
            columns.set(line, column + content.length);
            return {line, column};
        });
        origins.set(token.children, {
            scope,
            content: token.content,
            positions,
            starts,
            lines,
            firstContent: lines.map((line) => line.search(/\S/)),
            ...(cell?.content === token.content ? {offsets: cell.offsets} : {}),
        });
    }
}

/**
 * Reject unsupported constructs during the actual native inline parse.
 * @param md - Configured native parser; this installs no feature parser or I/O.
 * @returns Nothing; native code/escape/link parsing still owns its original tokens.
 */
export function installBrowserGuard(md: MarkdownIt): void {
    const include = createIncludeRegExp();
    const origins = new WeakMap<Token[], Origin>();
    let active: Origin | undefined;
    const original = md.inline.parse;
    md.inline.parse = function (...args) {
        const previous = active;
        const origin = origins.get(args[3]);
        active = origin?.content === args[0] ? origin : undefined;
        try {
            return original.apply(this, args);
        } finally {
            active = previous;
        }
    };
    md.core.ruler.before('inline', 'browser_guard_positions', (state) => {
        mapOrigins(state.tokens, createScope(state.src), origins);
    });
    md.inline.ruler.before('text', 'browser_unsupported', (state, silent) => {
        const origin = active;
        if (silent || !origin || state.linkLevel > 0) {
            return false;
        }
        const char = state.src[state.pos];
        if (char === '<') {
            protectHtml(origin, state.pos);
            return false;
        }
        if (char !== '{') {
            return false;
        }
        const index = contentLine(origin, state.pos);
        if (state.pos !== origin.starts[index] + origin.firstContent[index]) {
            return false;
        }
        const line = origin.lines[index].trim();
        let feature: BrowserUnsupportedFeature | undefined;
        if (include.test(state.src.trim())) {
            feature = 'include';
        } else if (
            /^\{%\s*included\s*\(.+?\)\s*%\}$/.test(line) ||
            /^\{%\s*endincluded\s*%\}$/.test(line)
        ) {
            feature = 'materialized-include';
        }
        if (!feature) {
            return false;
        }
        const offset = originalOffset(origin, state.pos);
        if (!origin.scope.protectedHtml.contains(offset)) {
            throw new BrowserUnsupportedFeatureError(
                feature,
                'Pre-expand includes on the host before browser transformation.',
                location(origin, state.pos, state.env),
            );
        }
        return false;
    });
}
