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

import {includedSourceRanges} from '../preprocessors/included/boundaries';

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
    const length = end ? end.index + end[0].length : source.length;
    return source.slice(0, length).replace(/[^\n]/g, ' ') + source.slice(length);
}
function lineStarts(source: string): number[] {
    const result = [0];
    for (let i = 0; i < source.length; i++) if (source[i] === '\n') result.push(i + 1);
    return result;
}
function apply(source: string, edits: readonly BlockDirectivesEdit[]): string {
    return [...edits]
        .sort((a, b) => b.start - a.start)
        .reduce(
            (text, edit) => text.slice(0, edit.start) + edit.replacement + text.slice(edit.end),
            source,
        );
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

function analyze(input: string): {tokens: Token[]; scopes: Scope[]} {
    const plain = new MarkdownIt({html: true});
    plain.core.ruler.enableOnly(['normalize', 'block']);
    const names = new Set(['cut', 'note', 'tabs', 'no-translate', 'visibility']);
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
    const md = new MarkdownIt({html: true}).use(directiveParser());
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
    scopes: readonly Scope[],
): void {
    if (!frame?.open.map || !frame.content?.map || !token.map)
        throw new Error('Unmapped Note wrapper');
    const start = frame.open.map[0],
        end = token.map[0];
    const colon = scopes.some((scope) => scope.name === 'note' && scope.start === start);
    if (
        !equalMap(frame.open.map, start, end + 1) ||
        !equalMap(frame.content.map, colon ? start + 1 : start + 2, colon ? end : end - 1)
    )
        throw new Error('Unexpected Note wrapper map');
}

function validateOwnerMaps(tokens: readonly Token[], scopes: readonly Scope[]): void {
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
        if (token.type === 'yfm_note_close') validateNoteMap(notes.pop(), token, scopes);
    }
    if (cuts.length || notes.length) throw new Error('Unclosed semantic wrapper');
}

function signature(
    source: string,
    generalAttrs: boolean,
    observe?: (name: string, line: number) => void,
): string {
    const diagnostics: unknown[] = [],
        ids: string[] = [],
        logs: string[] = [],
        resources: string[] = [];
    const md = new MarkdownIt({html: true});
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
    const tokens = md.parse(shield(normalize(source).input), env);
    validateOwnerMaps(tokens, analyze(shield(normalize(source).input)).scopes);
    const structural = new Set<string>([
        TokenType.CutOpen,
        TokenType.CutClose,
        TokenType.TitleOpen,
        TokenType.TitleClose,
        TokenType.ContentOpen,
        TokenType.ContentClose,
    ]);
    const cutStack: boolean[] = [];
    let cutTitle = false;
    let noteTitle = false;
    const projected = tokens.map((token) => {
        if (token.type === TokenType.CutOpen) cutStack.push(token.markup.startsWith(':::'));
        if (token.type === TokenType.TitleOpen) cutTitle = true;
        if (token.type === 'yfm_note_title_open') noteTitle = true;
        const owner = structural.has(token.type);
        const noteOwner = token.type.startsWith('yfm_note_');
        const cutDepth = cutStack.filter(Boolean).length;
        const projection = {
            type: token.type,
            tag: token.tag,
            nesting: token.nesting,
            attrs: token.attrs,
            // Owner title raw encoding may differ while parsed children and HTML remain exact.
            content: token.type === 'inline' && (cutTitle || noteTitle) ? undefined : token.content,
            hidden: token.hidden,
            info: token.info,
            meta: token.meta,
            level: owner ? undefined : token.level - (noteOwner || noteTitle ? 0 : cutDepth * 2),
            block: owner || (cutTitle && token.type === 'inline') ? undefined : token.block,
            // Only owner wrapper boundaries and markup differ by the documented syntax contract.
            map: owner || token.type === 'yfm_note_content_open' ? undefined : token.map,
            markup: owner ? undefined : token.markup,
            children: token.children,
        };
        if (token.type === TokenType.TitleClose) cutTitle = false;
        if (token.type === 'yfm_note_title_close') noteTitle = false;
        if (token.type === TokenType.CutClose) cutStack.pop();
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
    const diagnostic = (reason: string, offset: number) => {
        const parts = source.slice(0, offset).split(/\r\n|\r|\n/);
        diagnostics.push({
            code: 'BLOCK_DIRECTIVE_NOT_MIGRATED',
            reason,
            offset,
            line: parts.length,
            column: parts[parts.length - 1].length + 1,
            ...(options.path === undefined ? {} : {path: options.path}),
        });
    };
    const atLine = (line: number) => normalized.offsets[lines[line]] ?? source.length;
    try {
        const {tokens, scopes} = analyze(input);
        const baseline = [
            signature(source, false, (name, line) => {
                const scope = scopes.find((item) => item.name === name && item.start === line - 1);
                if (scope) scope.protected = true;
            }),
            signature(source, true),
        ];
        const equivalent = (candidate: string) => {
            try {
                return baseline.every(
                    (value, index) => value === signature(candidate, Boolean(index)),
                );
            } catch {
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
                if (
                    scopes.some(
                        (scope) =>
                            (scope.start < start && start < scope.end) !==
                            (scope.start < end - 1 && end - 1 < scope.end),
                    )
                )
                    pair.bad = true;
                if (pair.open.kind !== 'open' || !opening(pair.open)) pair.bad = true;
                if (pair.bad) badRanges.push({start, end});
            }
            return {pairs, badRanges};
        };
        const {pairs, badRanges} = pairEdges();
        const collectGroups = (): Group[] => {
            const groups: Group[] = [];
            for (const pair of pairs) {
                const start = pair.open.map[0],
                    end = pair.close.map[1];
                if (
                    pair.bad ||
                    pair.open.kind !== 'open' ||
                    scopes.some(
                        (scope) => scope.protected && start >= scope.start && end <= scope.end,
                    ) ||
                    badRanges.some((range) => start >= range.start && end <= range.end)
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
                    located.some((edit) =>
                        scopes.some(
                            (scope) =>
                                scope.protected &&
                                edit.start < atLine(scope.end) &&
                                edit.end > atLine(scope.start),
                        ),
                    )
                ) {
                    diagnostic('ambiguous-or-protected-range', atLine(start));
                    continue;
                }
                groups.push({open: pair.open, close: pair.close, edits: located});
            }
            return groups;
        };
        const groups = collectGroups();
        for (const range of badRanges)
            diagnostic('unclosed-or-crossed-container', atLine(range.start));
        for (const token of tokens) {
            if (
                token.type !== 'inline' ||
                !token.map ||
                !/^:{3,}\s*[A-Za-z]/.test(token.content) ||
                scopes.some((scope) => scope.start === token.map?.[0])
            )
                continue;
            const offset = atLine(token.map[0]);
            for (let i = groups.length - 1; i >= 0; i--)
                if (groups[i].edits[0].start >= offset) groups.splice(i, 1);
            diagnostic('unproved-colon-scope', offset);
        }
        const selectEdits = (): BlockDirectivesEdit[] => {
            let edits = groups.flatMap((group) => group.edits);
            if (!equivalent(apply(source, edits))) {
                const accepted: BlockDirectivesEdit[] = [],
                    refused: {start: number; end: number}[] = [];
                groups.sort(
                    (a, b) => a.open.map[0] - b.open.map[0] || b.close.map[1] - a.close.map[1],
                );
                for (const group of groups) {
                    const start = group.open.map[0],
                        end = group.close.map[1];
                    if (refused.some((range) => start >= range.start && end <= range.end)) {
                        diagnostic('unsupported-parent', group.edits[0].start);
                        continue;
                    }
                    let safe = false;
                    for (const escaped of [false, true]) {
                        const replacement = opening(group.open, escaped);
                        if (!replacement) continue;
                        const candidate = [{...group.edits[0], replacement}, group.edits[1]];
                        if (equivalent(apply(source, [...accepted, ...candidate]))) {
                            accepted.push(...candidate);
                            safe = true;
                            break;
                        }
                    }
                    if (!safe) {
                        refused.push({start, end});
                        diagnostic('equivalence-check-failed', group.edits[0].start);
                    }
                }
                edits = accepted;
            }
            return edits;
        };
        const edits = selectEdits();
        edits.sort((a, b) => a.start - b.start);
        if (
            edits.some((edit, index) => index > 0 && edits[index - 1].end > edit.start) ||
            !equivalent(apply(source, edits))
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
