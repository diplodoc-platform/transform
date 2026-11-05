import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {CutBoundary} from '@diplodoc/cut-extension/plugin';
import type {NoteBoundary} from '@diplodoc/notes-extension/plugin';
import type {TabsBoundary} from '@diplodoc/tabs-extension/plugin';

import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';
import {
    directiveParser,
    registerContainerDirective,
    tokenizeBlockContent,
} from '@diplodoc/directive';
import {AttrsParser} from '@diplodoc/utils';
import {TokenType, transform as cut, recognizeCutBoundary} from '@diplodoc/cut-extension/plugin';
import {createNotesPlugin, recognizeNoteBoundary} from '@diplodoc/notes-extension/plugin';
import {recognizeTabsBoundary, transform as tabs} from '@diplodoc/tabs-extension/plugin';

import {normalizeDocumentResources} from '../document-context-core';
import {includedSourceRanges} from '../preprocessors/included/boundaries';
import {createTablePlugin} from '../plugins/table/core';
import {createIncludeRegExp} from '../plugins/includes/syntax';

const table = createTablePlugin(() => ({
    warn() {},
    reset() {},
    compatibility: () => 'current',
}));

export interface BlockDirectivesMigrationOptions {
    readonly path?: string;
}
export interface BlockDirectivesEdit {
    readonly start: number;
    readonly end: number;
    readonly replacement: string;
}
export interface BlockDirectivesDiagnostic {
    readonly code: 'BLOCK_DIRECTIVE_NOT_MIGRATED';
    readonly reason: string;
    readonly offset: number;
    readonly line: number;
    readonly column: number;
    readonly path?: string;
}
export interface BlockDirectivesMigrationResult {
    readonly output: string;
    readonly edits: readonly BlockDirectivesEdit[];
    readonly diagnostics: readonly BlockDirectivesDiagnostic[];
}
type Edge =
    | ({name: 'cut'} & CutBoundary)
    | ({name: 'note'} & NoteBoundary)
    | ({name: 'tabs'} & TabsBoundary)
    | {name: 'cut'; kind: 'unsupported'; map: readonly [number, number] | null; raw: string};
type Open = Extract<Edge, {kind: 'open'}>;
type MappedEdge = Edge & {map: readonly [number, number]};
interface Scope {
    name: string;
    start: number;
    end: number;
    protected: boolean;
}
// Exact lookups keep the first scope, matching the diagnostic observer's former find().
function scopeKeys(scopes: readonly Scope[]) {
    const first = new Map<string, Map<number, Scope>>();
    const starts = new Set<number>();
    const notes = new Set<number>();
    for (const scope of scopes) {
        let named = first.get(scope.name);
        if (!named) first.set(scope.name, (named = new Map()));
        if (!named.has(scope.start)) named.set(scope.start, scope);
        starts.add(scope.start);
        if (scope.name === 'note') notes.add(scope.start);
    }
    return {first, starts, notes};
}

// Static range extrema over sorted endpoints: O(S log S) construction, O(log S) queries.
// Separate endpoint orderings preserve strict crossing and inclusive containment boundaries.
function scopeRanges(ranges: readonly {start: number; end: number}[]) {
    const index = (key: 'start' | 'end', value: 'start' | 'end', min: boolean) => {
        const sorted = [...ranges].sort((a, b) => a[key] - b[key]);
        const size = sorted.length;
        const empty = min ? Infinity : -Infinity;
        const combine = min ? Math.min : Math.max;
        const tree = Array<number>(size * 2).fill(empty);
        for (let i = 0; i < size; i++) tree[size + i] = sorted[i][value];
        for (let i = size - 1; i > 0; i--) tree[i] = combine(tree[i * 2], tree[i * 2 + 1]);
        const bound = (point: number, inclusive: boolean) => {
            let low = 0,
                high = size;
            while (low < high) {
                const middle = Math.floor((low + high) / 2);
                if (sorted[middle][key] < point || (inclusive && sorted[middle][key] === point))
                    low = middle + 1;
                else high = middle;
            }
            return low;
        };
        return (from: number, through: number, includeFrom: boolean, includeThrough: boolean) => {
            let left = bound(from, !includeFrom) + size;
            let right = bound(through, includeThrough) + size;
            let result = empty;
            while (left < right) {
                if (left % 2) result = combine(result, tree[left++]);
                if (right % 2) result = combine(result, tree[--right]);
                left = Math.floor(left / 2);
                right = Math.floor(right / 2);
            }
            return result;
        };
    };
    const maxEnd = index('start', 'end', false);
    const minStart = index('end', 'start', true);
    return {
        contains: (start: number, end: number) => maxEnd(-Infinity, start, true, true) >= end,
        overlaps: (start: number, end: number) => maxEnd(-Infinity, end, true, false) > start,
        crosses: (a: number, b: number) => {
            const start = Math.min(a, b),
                end = Math.max(a, b);
            return (
                maxEnd(start, end, true, false) > end || minStart(start, end, false, true) < start
            );
        },
    };
}
interface Pair {
    open: MappedEdge;
    close: MappedEdge;
    bad: boolean;
}
interface Group {
    open: Open & {map: readonly [number, number]};
    close: MappedEdge;
    edits: BlockDirectivesEdit[];
}

function normalize(source: string) {
    let input = '';
    const offsets: number[] = [];
    for (let i = source[0] === '\uFEFF' ? 1 : 0; i < source.length; i++) {
        offsets.push(i);
        if (source[i] === '\r') {
            input += '\n';
            if (source[i + 1] === '\n') i++;
        } else input += source[i] === '\0' ? '\uFFFD' : source[i];
    }
    offsets.push(source.length);
    return {input, offsets};
}
function shield(source: string): string {
    const opening = /^---[ \t]*(?:\n|$)/.exec(source);
    if (!opening) return source;
    const closing = /^(?:---|\.\.\.)[ \t]*$/gm;
    closing.lastIndex = opening[0].length;
    const end = closing.exec(source);
    if (!end) return source;
    const length = end.index + end[0].length;
    return source.slice(0, length).replace(/[^\n]/g, ' ') + source.slice(length);
}
function lineStarts(source: string): number[] {
    const result = [0];
    for (let i = 0; i < source.length; i++) if (source[i] === '\n') result.push(i + 1);
    return result;
}
function apply(source: string, edits: readonly BlockDirectivesEdit[]): string {
    const parts: string[] = [];
    let end = 0;
    for (const edit of [...edits].sort((a, b) => a.start - b.start)) {
        parts.push(source.slice(end, edit.start), edit.replacement);
        end = edit.end;
    }
    parts.push(source.slice(end));
    return parts.join('');
}
function escapeLabel(value: string): string {
    let result = '',
        slashes = 0;
    for (const char of value) {
        if ((char === '[' || char === ']') && slashes % 2 === 0) result += '\\';
        result += char;
        slashes = char === '\\' ? slashes + 1 : 0;
    }
    return result;
}
function opening(edge: Open, escaped = false): string | undefined {
    if (edge.name === 'cut') {
        let attributes = '';
        if (edge.rawAttributes) {
            if (!/^\{[^\n]*\}$/.test(edge.rawAttributes.trim())) return undefined;
            const token = new MarkdownIt().parse('x', {})[0];
            new AttrsParser(edge.rawAttributes).apply(token);
            if (
                (token.attrs ?? []).some(
                    ([name]) => !['id', 'class', 'open', 'name'].includes(name),
                )
            )
                return undefined;
            attributes = (token.attrs ?? [])
                .map(([name, value]) => `${name}=${JSON.stringify(String(value))}`)
                .join(' ');
            // A parser result does not prove it consumed the complete authored suffix.
            if (edge.rawAttributes !== `{${attributes}}`) return undefined;
        }
        return `:::cut [${escaped ? escapeLabel(edge.title) : edge.title}]${attributes ? ` {${attributes}}` : ''}`;
    }
    if (edge.name === 'note')
        return `:::note${edge.title.present ? ` [${escaped ? escapeLabel(edge.title.raw) : edge.title.raw}]` : ''} {type=${edge.type}}`;
    if (edge.group.present && !edge.group.value.trim()) return undefined;
    const variant =
        edge.variant.present && edge.variant.raw !== 'horizontal' ? edge.variant.raw : 'regular';
    return `:::tabs {variant=${variant}${edge.group.present ? ` group=${JSON.stringify(edge.group.value)}` : ''}}`;
}

function analyze(input: string, work = () => {}): {tokens: Token[]; scopes: Scope[]} {
    const plain = new MarkdownIt({html: true}).use(table);
    plain.core.ruler.enableOnly(['normalize', 'block']);
    const names = new Set(['cut', 'note', 'tabs', 'no-translate', 'visibility']);
    work();
    for (const token of plain.parse(input, {})) {
        if (token.type !== 'inline') continue;
        const match = /^:{3,}\s*([A-Za-z][A-Za-z0-9_-]*)/.exec(token.content);
        if (match) names.add(match[1].toLowerCase().replace('_', '-'));
    }
    const scopes: Scope[] = includedSourceRanges(input).map(({startLine, endLine}) => ({
        name: 'included-cache',
        start: startLine,
        end: endLine,
        protected: true,
    }));
    const md = new MarkdownIt({html: true}).use(table).use(directiveParser());
    for (const name of names) {
        registerContainerDirective(
            md,
            name,
            (state, params) => {
                scopes.push({
                    name,
                    start: params.startLine,
                    end: params.endLine,
                    protected: !['cut', 'note', 'tabs'].includes(name),
                });
                tokenizeBlockContent(state, params.content, 'migration-observation');
                return true;
            },
            {onConflict: 'error'},
        );
    }
    md.core.ruler.enableOnly(['normalize', 'block']);
    work();
    return {tokens: md.parse(input, {}), scopes};
}

type OwnerFrame = {open: Token; content?: Token};
const equalMap = (map: readonly number[] | null | undefined, start: number, end: number) =>
    Boolean(map && map[0] === start && map[1] === end);

function validateCutMap(frame: OwnerFrame | undefined, token: Token): void {
    if (!frame?.open.map || !frame.content?.map) throw new Error('Unmapped Cut wrapper');
    const start = frame.open.map[0];
    const colon = frame.open.markup.startsWith(':::');
    const end = colon ? frame.open.map[1] - 1 : token.map?.[0];
    if (
        end === undefined ||
        !equalMap(frame.open.map, start, colon ? end + 1 : start + 1) ||
        !equalMap(frame.content.map, start + 1, colon ? end : start + 2) ||
        (colon ? token.map !== null : !equalMap(token.map, end, end + 1))
    )
        throw new Error('Unexpected Cut wrapper map');
}

function validateNoteMap(
    frame: OwnerFrame | undefined,
    token: Token,
    notes: ReadonlySet<number>,
): void {
    if (!frame?.open.map || !frame.content?.map || !token.map)
        throw new Error('Unmapped Note wrapper');
    const start = frame.open.map[0],
        end = token.map[0];
    const colon = notes.has(start);
    if (
        !equalMap(frame.open.map, start, end + 1) ||
        !equalMap(frame.content.map, colon ? start + 1 : start + 2, colon ? end : end - 1)
    )
        throw new Error('Unexpected Note wrapper map');
}

function validateOwnerMaps(tokens: readonly Token[], noteStarts: ReadonlySet<number>): void {
    const cuts: OwnerFrame[] = [],
        notes: OwnerFrame[] = [];
    for (const token of tokens) {
        if (token.type === TokenType.CutOpen) cuts.push({open: token});
        if (token.type === TokenType.ContentOpen && cuts.length)
            cuts[cuts.length - 1].content = token;
        if (token.type === TokenType.CutClose) validateCutMap(cuts.pop(), token);
        if (token.type === 'yfm_note_open') notes.push({open: token});
        if (token.type === 'yfm_note_content_open' && notes.length)
            notes[notes.length - 1].content = token;
        if (token.type === 'yfm_note_close') validateNoteMap(notes.pop(), token, noteStarts);
    }
    if (cuts.length || notes.length) throw new Error('Unclosed semantic wrapper');
}

function unresolvedTemplate(input: string): number | undefined {
    // This finite inventory classifies existing YFM syntax, not arbitrary Liquid tags.
    const known = new Set([
        'cut',
        'endcut',
        'note',
        'endnote',
        'endlist',
        'include',
        'included',
        'endincluded',
        'file',
        'anchor',
        'changelog',
        'endchangelog',
    ]);
    const include = createIncludeRegExp();
    const name = /\s*([A-Za-z][\w-]*)(?=[\s%])/y;
    const tabs = /\s+tabs(?=[\s%])/y;
    let closing = -1;
    for (const match of input.matchAll(/\{\{|\{%/g)) {
        const offset = match.index;
        if (match[0] === '{{') return offset;
        name.lastIndex = offset + 2;
        const tag = name.exec(input)?.[1];
        tabs.lastIndex = name.lastIndex;
        const recognized = tag && (known.has(tag) || (tag === 'list' && tabs.test(input)));
        if (!recognized) return offset;
        if (closing < offset) closing = input.indexOf('%}', offset + 2);
        if (closing < 0) return offset;
        // Liquid also owns an include tag; only the existing YFM include grammar is exempt.
        if (tag === 'include' && !include.test(input.slice(offset, closing + 2))) return offset;
    }
    return undefined;
}

function projectToken(
    token: Token,
    context: {
        cutTitle: boolean;
        noteTitle: boolean;
        owner: boolean;
        map: Token['map'];
        level: number | undefined;
    },
) {
    const {cutTitle, noteTitle, owner, map, level} = context;
    return {
        type: token.type,
        tag: token.tag,
        nesting: token.nesting,
        attrs: token.attrs,
        // Owner title raw encoding may differ while parsed children and HTML remain exact.
        content: token.type === 'inline' && (cutTitle || noteTitle) ? undefined : token.content,
        hidden: token.hidden,
        info: token.info,
        meta: token.meta,
        level,
        block: owner || (cutTitle && token.type === 'inline') ? undefined : token.block,
        // Only owner wrapper boundaries and markup differ by the documented syntax contract.
        map: owner || token.type === 'yfm_note_content_open' ? undefined : map,
        markup: owner ? undefined : token.markup,
        children: token.children,
    };
}

function signature(
    source: string,
    generalAttrs: boolean,
    noteStarts: ReadonlySet<number>,
    noteBodyOffset: number,
    work = () => {},
    observe?: (name: string, line: number) => void,
): string {
    const diagnostics: unknown[] = [],
        ids: string[] = [],
        logs: string[] = [],
        resources: string[] = [];
    const md = new MarkdownIt({html: true}).use(table);
    if (generalAttrs) md.use(attrs);
    md.use(
        cut({
            bundle: false,
            directiveSyntax: 'enabled',
            onDiagnostic: (item) => {
                diagnostics.push({name: 'cut', ...item});
                observe?.('cut', item.line);
            },
        }),
    );
    md.use(
        createNotesPlugin(undefined, () => resources.push('note'), {
            directiveSyntax: 'enabled',
            onDiagnostic: (item) => {
                diagnostics.push({name: 'note', ...item});
                observe?.('note', item.line);
            },
        }),
        {
            lang: 'en',
            path: 'migration.md',
            log: {
                warn: (message: string) => logs.push(message),
                error: (message: string) => logs.push(message),
                info: () => {},
            },
        },
    );
    md.use(
        tabs({
            bundle: false,
            directiveSyntax: 'enabled',
            onDiagnostic: (item) => {
                diagnostics.push({name: 'tabs', ...item});
                observe?.('tabs', item.line);
            },
            features: {
                enabledVariants: {regular: true, radio: true, dropdown: true, accordion: true},
            },
        }),
        {
            generateID: (prefix = '') => {
                ids.push(prefix);
                return `${prefix}-${ids.length}`;
            },
        },
    );
    const env = {};
    work();
    const tokens = md.parse(shield(normalize(source).input), env);
    validateOwnerMaps(tokens, noteStarts);
    const structural = new Set<string>([
        TokenType.CutOpen,
        TokenType.CutClose,
        TokenType.TitleOpen,
        TokenType.TitleClose,
        TokenType.ContentOpen,
        TokenType.ContentClose,
    ]);
    const cutStack: Token[] = [];
    const noteStack: {colon: boolean; content: boolean}[] = [];
    let cutTitle = false;
    let noteTitle = false;
    const projected = tokens.map((token) => {
        if (token.type === TokenType.CutOpen) cutStack.push(token);
        if (token.type === 'yfm_note_open')
            noteStack.push({
                colon: Boolean(token.map && noteStarts.has(token.map[0])),
                content: false,
            });
        if (token.type === 'yfm_note_content_close')
            noteStack[noteStack.length - 1].content = false;
        if (token.type === TokenType.TitleOpen) cutTitle = true;
        if (token.type === 'yfm_note_title_open') noteTitle = true;
        const owner = structural.has(token.type);
        const noteOwner = token.type.startsWith('yfm_note_');
        const cutDepth = cutStack.filter((open) => open.markup.startsWith(':::')).length;
        const noteDepth = noteStack.filter((frame) => frame.colon && frame.content).length;
        let map = token.map;
        if (cutTitle && token.type === 'inline') {
            const open = cutStack[cutStack.length - 1];
            const start = open.markup.startsWith(':::') ? open.map?.[0] : 0;
            if (start === undefined || !equalMap(map, start, start + 1))
                throw new Error('Unexpected Cut title map');
            map = null;
        }
        const projection = projectToken(token, {
            cutTitle,
            noteTitle,
            owner,
            map,
            level: owner
                ? undefined
                : token.level -
                  (noteOwner || noteTitle ? 0 : cutDepth * 2 + noteDepth * noteBodyOffset),
        });
        if (token.type === TokenType.TitleClose) cutTitle = false;
        if (token.type === 'yfm_note_title_close') noteTitle = false;
        if (token.type === TokenType.CutClose) cutStack.pop();
        if (token.type === 'yfm_note_content_open') noteStack[noteStack.length - 1].content = true;
        if (token.type === 'yfm_note_close') noteStack.pop();
        return projection;
    });
    const savedBlocks = tokens
        .filter((token) => structural.has(token.type))
        .map((token) => ({token, block: token.block}));
    let html: string;
    try {
        for (const {token} of savedBlocks) token.block = false;
        html = md.renderer.render(tokens, md.options, env);
    } finally {
        for (const {token, block} of savedBlocks) token.block = block;
    }
    normalizeDocumentResources(env);
    return JSON.stringify({
        html,
        tokens: projected,
        env,
        ids,
        resources,
        diagnostics,
        logs,
    });
}

/**
 * Migrate independently proven legacy block directives using original UTF-16 offsets.
 * Cut attribute suffixes are eligible only when they exactly round-trip through the
 * owner parser into a single canonical attribute group; shorthand is left unchanged.
 * @param source - Original Markdown source, without preprocessing.
 * @param options - Optional source label for diagnostics.
 * @returns The edited source, nonoverlapping edits, and located refusals.
 */
export function migrateBlockDirectives(
    source: string,
    options: BlockDirectivesMigrationOptions = {},
): BlockDirectivesMigrationResult {
    const normalized = normalize(source),
        input = shield(normalized.input),
        lines = lineStarts(input);
    const diagnostics: BlockDirectivesDiagnostic[] = [];
    const originalLines = [0];
    for (let i = 0; i < source.length; i++) {
        if (source[i] === '\r' && source[i + 1] === '\n') i++;
        if (source[i] === '\r' || source[i] === '\n') originalLines.push(i + 1);
    }
    const diagnostic = (reason: string, offset: number) => {
        let low = 0,
            high = originalLines.length;
        while (low + 1 < high) {
            const middle = Math.floor((low + high) / 2);
            if (originalLines[middle] <= offset) low = middle;
            else high = middle;
        }
        diagnostics.push({
            code: 'BLOCK_DIRECTIVE_NOT_MIGRATED',
            reason,
            offset,
            line: low + 1,
            column: offset - originalLines[low] + 1,
            ...(options.path === undefined ? {} : {path: options.path}),
        });
    };
    const atLine = (line: number) => normalized.offsets[lines[line]] ?? source.length;
    const template = unresolvedTemplate(input);
    if (template !== undefined) {
        diagnostic('unresolved-liquid-template', normalized.offsets[template]);
        return {output: source, edits: [], diagnostics};
    }
    try {
        const {tokens, scopes} = analyze(input);
        const keys = scopeKeys(scopes);
        // Each full-input parser call consumes one unit. Setup and final proof are constant.
        let remainingWork = 32;
        const exhausted = new Error('Equivalence work budget exhausted');
        const work = () => {
            if (remainingWork === 0) throw exhausted;
            remainingWork--;
        };
        const offsets = [false, true].map((generalAttrs) => {
            if (
                !tokens.some(
                    (token) => token.type === 'inline' && /\{%\s*note\b/.test(token.content),
                )
            )
                return 0;
            const probe = new MarkdownIt();
            if (generalAttrs) probe.use(attrs);
            probe.use(createNotesPlugin(undefined, undefined, {directiveSyntax: 'enabled'}));
            let parsed: Token[];
            try {
                parsed = probe.parse(':::note {type=info}\n\nProbe\n\n:::', {});
                validateOwnerMaps(parsed, new Set([0]));
            } catch {
                return 0;
            }
            const expected = [
                'yfm_note_open',
                'yfm_note_title_open',
                'inline',
                'yfm_note_title_close',
                'yfm_note_content_open',
                'paragraph_open',
                'inline',
                'paragraph_close',
                'yfm_note_content_close',
                'yfm_note_close',
            ];
            const levels = parsed.map((token) => token.level);
            const nesting = [1, 1, 0, -1, 1, 1, 0, -1, -1, -1];
            if (
                parsed.length !== expected.length ||
                parsed.some(
                    (token, index) =>
                        token.type !== expected[index] || token.nesting !== nesting[index],
                )
            )
                return 0;
            for (const offset of [0, 2]) {
                const wanted = [0, 0, 0, 0, 0, offset, offset + 1, offset, 0, 0];
                if (levels.every((level, index) => level === wanted[index])) return offset;
            }
            return 0;
        });
        const baseline = [
            signature(source, false, keys.notes, offsets[0], undefined, (name, line) => {
                const scope = keys.first.get(name)?.get(line - 1);
                if (scope) scope.protected = true;
            }),
            signature(source, true, keys.notes, offsets[1]),
        ];
        const ranges = scopeRanges(scopes);
        const protectedScopes = scopes.filter((scope) => scope.protected);
        const protectedLines = scopeRanges(protectedScopes);
        const protectedOffsets = scopeRanges(
            protectedScopes.map((scope) => ({start: atLine(scope.start), end: atLine(scope.end)})),
        );
        const cache = new Map<string, boolean>([[source, true]]);
        const equivalent = (candidate: string, final = false): boolean | undefined => {
            if (!final && cache.has(candidate)) return cache.get(candidate);
            try {
                const count = final ? undefined : work;
                const candidateNotes = scopeKeys(
                    analyze(shield(normalize(candidate).input), count).scopes,
                ).notes;
                const result = baseline.every(
                    (value, index) =>
                        value ===
                        signature(candidate, Boolean(index), candidateNotes, offsets[index], count),
                );
                if (!final) cache.set(candidate, result);
                return result;
            } catch (error) {
                if (error === exhausted) return undefined;
                if (!final) cache.set(candidate, false);
                return false;
            }
        };
        const collectEdges = (): MappedEdge[] => {
            const edges: MappedEdge[] = [];
            for (let i = 0; i < tokens.length; i++) {
                const cutEdge = recognizeCutBoundary(tokens, i),
                    noteEdge = recognizeNoteBoundary(tokens, i),
                    tabsEdge = recognizeTabsBoundary(tokens, i);
                if (cutEdge?.map) edges.push({...cutEdge, name: 'cut', map: cutEdge.map});
                if (noteEdge?.map) edges.push({...noteEdge, name: 'note', map: noteEdge.map});
                if (tabsEdge?.map) edges.push({...tabsEdge, name: 'tabs', map: tabsEdge.map});
                const currentMap = tokens[i].map;
                if (
                    !cutEdge &&
                    !noteEdge &&
                    !tabsEdge &&
                    tokens[i].type === 'paragraph_open' &&
                    tokens[i + 1]?.type === 'inline' &&
                    /^\{%\s*cut\b/i.test(tokens[i + 1].content) &&
                    currentMap
                ) {
                    edges.push({
                        name: 'cut',
                        kind: 'unsupported',
                        map: currentMap,
                        raw: tokens[i + 1].content,
                    });
                }
            }
            return edges;
        };
        const edges = collectEdges();
        const pairEdges = () => {
            const stack: {open: MappedEdge; bad: boolean}[] = [],
                pairs: Pair[] = [];
            for (const edge of edges) {
                if (edge.kind !== 'close') {
                    stack.push({open: edge, bad: edge.kind === 'unsupported'});
                    continue;
                }
                let match = stack.length - 1;
                while (match >= 0 && stack[match].open.name !== edge.name) match--;
                if (match < 0) {
                    diagnostic('unmatched-close', atLine(edge.map[0]));
                    continue;
                }
                const crossed = match !== stack.length - 1;
                const item = stack[match];
                if (crossed) {
                    for (const affected of stack.slice(match)) {
                        affected.bad = true;
                        diagnostic('crossed-container', atLine(affected.open.map[0]));
                    }
                }
                stack.splice(match, 1);
                pairs.push({open: item.open, close: edge, bad: item.bad || crossed});
            }
            const badRanges = stack.map(({open}) => ({start: open.map[0], end: Infinity}));
            for (const pair of pairs) {
                const start = pair.open.map[0],
                    end = pair.close.map[1];
                if (ranges.crosses(start, end - 1)) pair.bad = true;
                if (pair.open.kind !== 'open' || !opening(pair.open)) pair.bad = true;
                if (pair.bad) badRanges.push({start, end});
            }
            return {pairs, badRanges};
        };
        const {pairs, badRanges} = pairEdges();
        const badScopes = scopeRanges(badRanges);
        const collectGroups = (): Group[] => {
            const groups: Group[] = [];
            for (const pair of pairs) {
                const start = pair.open.map[0],
                    end = pair.close.map[1];
                if (
                    pair.bad ||
                    pair.open.kind !== 'open' ||
                    protectedLines.contains(start, end) ||
                    badScopes.contains(start, end)
                ) {
                    diagnostic('unsupported-or-protected-container', atLine(start));
                    continue;
                }
                const marker = opening(pair.open);
                if (!marker) {
                    diagnostic('unsupported-parameters', atLine(start));
                    continue;
                }
                const located: BlockDirectivesEdit[] = [];
                for (const [edge, replacement] of [
                    [pair.open, marker],
                    [pair.close, ':::'],
                ] as const) {
                    if (edge.map[1] !== edge.map[0] + 1 || edge.raw.includes('\n')) break;
                    const base = lines[edge.map[0]],
                        lineEnd = lines[edge.map[1]] ?? input.length;
                    const line = input.slice(base, lineEnd).replace(/\n$/, ''),
                        found = line.indexOf(edge.raw);
                    if (found < 0 || line.indexOf(edge.raw, found + 1) >= 0) break;
                    located.push({
                        start: normalized.offsets[base + found],
                        end: normalized.offsets[base + found + edge.raw.length],
                        replacement,
                    });
                }
                if (
                    located.length !== 2 ||
                    located.some((edit) => protectedOffsets.overlaps(edit.start, edit.end))
                ) {
                    diagnostic('ambiguous-or-protected-range', atLine(start));
                    continue;
                }
                groups.push({open: pair.open, close: pair.close, edits: located});
            }
            return groups;
        };
        let groups = collectGroups();
        for (const range of badRanges)
            diagnostic('unclosed-or-crossed-container', atLine(range.start));
        let unprovedStart = Infinity;
        for (const token of tokens) {
            if (
                token.type !== 'inline' ||
                !token.map ||
                !/^:{3,}\s*[A-Za-z]/.test(token.content) ||
                keys.starts.has(token.map[0])
            )
                continue;
            const offset = atLine(token.map[0]);
            unprovedStart = Math.min(unprovedStart, offset);
            diagnostic('unproved-colon-scope', offset);
        }
        groups = groups.filter((group) => group.edits[0].start < unprovedStart);
        const selectEdits = (): BlockDirectivesEdit[] => {
            groups.sort((a, b) => a.open.map[0] - b.open.map[0] || b.close.map[1] - a.close.map[1]);
            // Nested groups stay atomic: a refused parent never leaves rewritten descendants.
            const units: Group[][] = [];
            for (const group of groups) {
                const previous = units[units.length - 1];
                if (previous && group.close.map[1] <= previous[0].close.map[1])
                    previous.push(group);
                else units.push([group]);
            }
            const accepted: BlockDirectivesEdit[] = [];
            const visit = (batch: Group[][]): void => {
                if (!batch.length) return;
                const selected = batch.flat();
                if (remainingWork === 0) {
                    for (const group of selected)
                        diagnostic('equivalence-budget-exceeded', group.edits[0].start);
                    return;
                }
                const proposed = selected.flatMap((group) => group.edits);
                const proof = equivalent(apply(source, [...accepted, ...proposed]));
                if (proof) {
                    accepted.push(...proposed);
                    return;
                }
                if (proof === undefined) {
                    for (const group of selected)
                        diagnostic('equivalence-budget-exceeded', group.edits[0].start);
                    return;
                }
                if (batch.length > 1) {
                    const middle = Math.floor(batch.length / 2);
                    visit(batch.slice(0, middle));
                    visit(batch.slice(middle));
                    return;
                }
                const escaped = selected.flatMap((group) => [
                    {
                        ...group.edits[0],
                        replacement: opening(group.open, true) ?? group.edits[0].replacement,
                    },
                    group.edits[1],
                ]);
                const fallback = equivalent(apply(source, [...accepted, ...escaped]));
                if (fallback) accepted.push(...escaped);
                else
                    for (const group of selected)
                        diagnostic(
                            fallback === undefined
                                ? 'equivalence-budget-exceeded'
                                : 'equivalence-check-failed',
                            group.edits[0].start,
                        );
            };
            visit(units);
            return accepted;
        };
        const edits = selectEdits();
        edits.sort((a, b) => a.start - b.start);
        if (
            edits.some((edit, index) => index > 0 && edits[index - 1].end > edit.start) ||
            !equivalent(apply(source, edits), true)
        )
            throw new Error('Final equivalence check failed');
        return {
            output: apply(source, edits),
            edits,
            diagnostics: diagnostics.sort((a, b) => a.offset - b.offset),
        };
    } catch {
        diagnostic('parser-or-equivalence-failed', 0);
        return {output: source, edits: [], diagnostics};
    }
}
