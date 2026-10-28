import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {MarkdownIt, ParserEnv} from '../shared-types';
import type {BrowserSourceLocation, BrowserUnsupportedFeature} from './errors';

import {createIncludeRegExp} from '../plugins/includes/syntax';

import {BrowserUnsupportedFeatureError} from './errors';

interface Scope {
    source: string;
    lines: string[];
    starts: number[];
    protectedHtml: {start: number; end: number}[];
}

interface Origin {
    scope: Scope;
    content: string;
    positions: {line: number; column: number}[];
    starts: number[];
    lines: string[];
    firstContent: number[];
}

function createScope(source: string): Scope {
    const lines = source.split('\n');
    let offset = 0;
    const starts = lines.map((line) => {
        const start = offset;
        offset += line.length + 1;
        return start;
    });
    return {source, lines, starts, protectedHtml: []};
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
        const close = source.indexOf('-->', start + 4);
        origin.scope.protectedHtml.push({start, end: close < 0 ? source.length : close + 3});
        return;
    }
    // This only tracks a quoted tag's range; native Markdown parsing is left intact.
    if (!/^<\/?[A-Za-z][A-Za-z0-9-]*(?=[\s/>])/.test(source.slice(start))) {
        return;
    }
    let quote = '';
    for (let end = start + 1; end < source.length; end++) {
        const char = source[end];
        if (quote) {
            if (char === quote) {
                quote = '';
            }
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (char === '>') {
            origin.scope.protectedHtml.push({start, end: end + 1});
            return;
        }
    }
}

function mapOrigins(tokens: Token[], scope: Scope, origins: WeakMap<Token[], Origin>): void {
    const columns = new Map<number, number>();
    for (const token of tokens) {
        if (token.type !== 'inline' || !token.children) {
            continue;
        }
        const first = token.map?.[0] ?? 0;
        const lines = token.content.split('\n');
        let offset = 0;
        const starts = lines.map((line) => {
            const start = offset;
            offset += line.length + 1;
            return start;
        });
        const positions = lines.map((content, index) => {
            const line = first + index;
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
        if (
            !origin.scope.protectedHtml.some((range) => range.start <= offset && offset < range.end)
        ) {
            throw new BrowserUnsupportedFeatureError(
                feature,
                'Pre-expand includes on the host before browser transformation.',
                location(origin, state.pos, state.env),
            );
        }
        return false;
    });
}
