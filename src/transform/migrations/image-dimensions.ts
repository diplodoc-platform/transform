import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {ParserEnv} from '../typings';
import type {ImageSizeObserver, ImageSizeSpan} from '../plugins/imsize/positions';

import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';

import {imageWithSize} from '../plugins/imsize/plugin';
import {createTablePlugin} from '../plugins/table/core';

const table = createTablePlugin(() => ({
    warn() {},
    reset() {},
    compatibility: () => 'current',
}));

export interface ImageDimensionsMigrationOptions {
    readonly path?: string;
}

export interface ImageDimensionsEdit {
    /** Zero-based UTF-16 offsets into the original source; end is exclusive. */
    readonly start: number;
    readonly end: number;
    readonly replacement: string;
}

export type ImageDimensionsMigrationReason =
    | 'noncanonical-dimensions'
    | 'existing-attributes'
    | 'unsupported-legacy-form'
    | 'ambiguous-source-range'
    | 'nested-image'
    | 'equivalence-check-failed'
    | 'equivalence-budget-exceeded'
    | 'html-disabled-image';

export interface ImageDimensionsMigrationDiagnostic {
    readonly code: 'IMAGE_DIMENSIONS_NOT_MIGRATED';
    readonly reason: ImageDimensionsMigrationReason;
    readonly message: string;
    readonly offset: number;
    readonly line: number;
    readonly column: number;
    readonly path?: string;
}

export interface ImageDimensionsMigrationResult {
    readonly output: string;
    readonly edits: readonly ImageDimensionsEdit[];
    readonly diagnostics: readonly ImageDimensionsMigrationDiagnostic[];
}

interface Candidate {
    span: ImageSizeSpan;
    inline: Token;
    nested: boolean;
}

interface Proof {
    tokens: Token[];
    env: ParserEnv;
    signature: string;
}

interface Mode {
    md: ReturnType<typeof createParser>;
    source: Proof;
    paragraphs: Map<string, Token[]>;
}

const paragraphKey = (map: readonly number[]) => `${map[0]}:${map[1]}`;

function normalizeSource(source: string) {
    const characters: string[] = [];
    const offsets: number[] = [];
    for (let index = 0; index < source.length; index++) {
        offsets.push(index);
        if (source[index] === '\r') {
            characters.push('\n');
            if (source[index + 1] === '\n') {
                index++;
            }
        } else {
            characters.push(source[index] === '\0' ? '\uFFFD' : source[index]);
        }
    }
    offsets.push(source.length);
    return {normalized: characters.join(''), offsets};
}

function shieldFrontmatter(source: string): string {
    const opening = /^(?:\uFEFF)?---[ \t]*(?:\n|$)/.exec(source);
    if (!opening) {
        return source;
    }
    const closing = /^(?:---|\.\.\.)[ \t]*$/gm;
    closing.lastIndex = opening[0].length;
    const end = closing.exec(source);
    const length = end ? end.index + end[0].length : source.length;
    return source.slice(0, length).replace(/[^\n]/g, ' ') + source.slice(length);
}

function lineStarts(source: string): number[] {
    const result = [0];
    for (let index = 0; index < source.length; index++) {
        if (source[index] === '\n') {
            result.push(index + 1);
        }
    }
    return result;
}

function createParser(
    generalAttrs: boolean,
    styling: boolean,
    observer?: ImageSizeObserver,
    html = true,
) {
    const md = new MarkdownIt({html}).use(table);
    // Use the recognizer directly: migration has no runtime diagnostics or root hooks.
    md.inline.ruler.before(
        'emphasis',
        'image',
        imageWithSize(md, {enableInlineStyling: styling}, observer),
    );
    if (generalAttrs) {
        md.use(attrs);
    }
    return md;
}

function canonicalTokens(tokens: Token[]): unknown {
    return tokens.map((token) => ({
        type: token.type,
        tag: token.tag,
        nesting: token.nesting,
        attrs: token.attrs?.slice().sort(([a], [b]) => a.localeCompare(b)),
        content: token.type === 'inline' ? '' : token.content,
        markup: token.markup,
        info: token.info,
        hidden: token.hidden,
        children: token.children && canonicalTokens(token.children),
    }));
}

function signature(md: ReturnType<typeof createParser>, tokens: Token[], env: ParserEnv): string {
    return JSON.stringify({
        tokens: canonicalTokens(tokens),
        html: md.renderer.render(tokens, md.options, env),
        css: env.additionalOptionsCssWhiteList,
    });
}

function proof(
    md: ReturnType<typeof createParser>,
    input: string,
    references?: ParserEnv['references'],
): Proof {
    // Paragraph proofs read the same reference facts without copying the complete table.
    // A fresh prototype overlay also isolates any local reference-definition writes.
    const env: ParserEnv = references ? {references: Object.create(references)} : {};
    const tokens = md.parse(input, env);
    return {tokens, env, signature: signature(md, tokens, env)};
}

function paragraphs(tokens: Token[]): Map<string, Token[]> {
    const result = new Map<string, Token[]>();
    for (let index = 0; index + 2 < tokens.length; index++) {
        const [open, inline, close] = tokens.slice(index, index + 3);
        if (
            open.type === 'paragraph_open' &&
            open.level === 0 &&
            inline.type === 'inline' &&
            inline.map &&
            inline.map[1] === inline.map[0] + 1 &&
            close.type === 'paragraph_close'
        ) {
            result.set(paragraphKey(inline.map), [open, inline, close]);
        }
    }
    return result;
}

function apply(source: string, edits: readonly ImageDimensionsEdit[]): string {
    const parts: string[] = [];
    let end = 0;
    for (const edit of edits) {
        parts.push(source.slice(end, edit.start), edit.replacement);
        end = edit.end;
    }
    parts.push(source.slice(end));
    return parts.join('');
}

function collect(tokens: Token[], spans: WeakMap<Token, ImageSizeSpan>): Candidate[] {
    const result: Candidate[] = [];
    for (const inline of tokens.filter((token) => token.type === 'inline')) {
        const walk = (children: Token[], insideImage = false): boolean => {
            let containsLegacy = false;
            for (const token of children) {
                const nestedLegacy = walk(
                    token.children ?? [],
                    insideImage || token.type === 'image',
                );
                const span = spans.get(token);
                if (span) {
                    result.push({span, inline, nested: insideImage || nestedLegacy});
                    containsLegacy = true;
                }
                containsLegacy ||= nestedLegacy;
            }
            return containsLegacy;
        };
        walk(inline.children ?? []);
    }
    return result;
}

function inlineOffset(inline: Token, source: string, starts: number[]): number | undefined {
    if (!inline.map || !inline.content) {
        return undefined;
    }
    const start = starts[inline.map[0]];
    const end = starts[inline.map[1]] ?? source.length;
    const block = source.slice(start, end);
    const offset = block.indexOf(inline.content);
    if (offset < 0 || block.indexOf(inline.content, offset + 1) >= 0) {
        return undefined;
    }
    return start + offset;
}

function dimensionEdits(
    span: ImageSizeSpan,
    base: number,
    offset: (normalized: number) => number,
): ImageDimensionsEdit[] {
    const dimensions = [span.width && `width=${span.width}`, span.height && `height=${span.height}`]
        .filter(Boolean)
        .join(' ');
    return [
        {
            start: offset(base + span.sizeStart - 1),
            end: offset(base + span.sizeEnd),
            replacement: '',
        },
        ...(dimensions
            ? [
                  {
                      start: offset(base + span.imageEnd),
                      end: offset(base + span.imageEnd),
                      replacement: `{${dimensions}}`,
                  },
              ]
            : []),
    ];
}

const htmlContainers = new Set([
    'div',
    'section',
    'article',
    'aside',
    'main',
    'header',
    'footer',
    'nav',
    'figure',
    'figcaption',
    'details',
    'summary',
    'blockquote',
]);

function htmlImageDiagnostics(
    input: string,
    tokens: Token[],
    starts: number[],
    diagnostic: (offset: number) => void,
): void {
    const html = new MarkdownIt({html: true});
    const blocks: {start: number; end: number}[] = [];
    for (const token of tokens) {
        if (token.type !== 'html_block' || token.level !== 0 || !token.map) continue;
        const first = input.slice(starts[token.map[0]], starts[token.map[0] + 1]).trim();
        const last = input.slice(starts[token.map[1] - 1], starts[token.map[1]]).trim();
        const tag = /^<([A-Za-z][A-Za-z0-9-]*)\b/.exec(first)?.[1].toLowerCase();
        if (!tag || !htmlContainers.has(tag) || /\/\s*>$/.test(first)) continue;
        const children = html.parseInline(first, {})[0]?.children;
        if (
            children?.length !== 1 ||
            children[0].type !== 'html_inline' ||
            children[0].content !== first
        )
            continue;
        if (!new RegExp(`^<\\/${tag}\\s*>$`, 'i').test(last)) continue;
        const start = starts[token.map[0] + 1];
        const end = starts[token.map[1] - 1];
        if (start < end) blocks.push({start, end});
    }
    if (!blocks.length) return;

    const positions = (source: string, parsed: Token[], spans: WeakMap<Token, ImageSizeSpan>) => {
        const lines = lineStarts(source);
        const bases = new WeakMap<Token, number | undefined>();
        const result = new Map<string, number>();
        for (const {span, inline, nested} of collect(parsed, spans)) {
            if (nested || span.source !== inline.content) continue;
            if (!bases.has(inline)) bases.set(inline, inlineOffset(inline, source, lines));
            const base = bases.get(inline);
            if (base === undefined) continue;
            result.set(
                `${base + span.imageStart}:${base + span.sizeStart}:${base + span.sizeEnd}`,
                base + span.sizeStart,
            );
        }
        return result;
    };
    const spans = new WeakMap<Token, ImageSizeSpan>();
    const disabled = createParser(
        false,
        false,
        {image: (span, token) => spans.set(token, span)},
        false,
    );
    const env: ParserEnv = {};
    const actual = positions(input, disabled.parse(input, env), spans);
    const bodySpans = new WeakMap<Token, ImageSizeSpan>();
    const bodyParser = createParser(false, false, {
        image: (span, token) => bodySpans.set(token, span),
    });
    for (const block of blocks) {
        const body = input.slice(block.start, block.end);
        const bodyEnv: ParserEnv = env.references
            ? {references: Object.create(env.references)}
            : {};
        const found = positions(body, bodyParser.parse(body, bodyEnv), bodySpans);
        for (const [key, offset] of found) {
            const originalKey = key
                .split(':')
                .map((value) => Number(value) + block.start)
                .join(':');
            if (actual.has(originalKey)) diagnostic(block.start + offset);
        }
    }
}

function candidateFailure(
    candidate: Candidate,
    base: number | undefined,
): ImageDimensionsMigrationReason | undefined {
    const {span, inline, nested} = candidate;
    if (nested || span.source !== inline.content) return 'nested-image';
    if (base === undefined) return 'ambiguous-source-range';
    if (span.adjacentAttributes) return 'existing-attributes';
    if ([span.width, span.height].some((value) => !/^(?:[0-9]+%?)?$/.test(value)))
        return 'noncanonical-dimensions';
    return undefined;
}

function rejectedCandidates(tokens: Token[], rejected: Map<string, Set<number>>) {
    const byContent = new Map<string, Token[]>();
    for (const token of tokens) {
        if (token.type !== 'inline') continue;
        if (!byContent.has(token.content)) byContent.set(token.content, []);
        byContent.get(token.content)?.push(token);
    }
    const result: {inline: Token; sizeStart: number}[] = [];
    for (const [content, sizes] of rejected) {
        for (const inline of byContent.get(content) ?? []) {
            for (const sizeStart of sizes) result.push({inline, sizeStart});
        }
    }
    return result;
}

function createDiagnostics(source: string, options: ImageDimensionsMigrationOptions) {
    const diagnostics: ImageDimensionsMigrationDiagnostic[] = [];
    const diagnosticKeys = new Set<string>();
    const originalLines = [0];
    for (let index = 0; index < source.length; index++) {
        if (source[index] === '\r' && source[index + 1] === '\n') index++;
        if (source[index] === '\r' || source[index] === '\n') originalLines.push(index + 1);
    }
    const diagnostic = (reason: ImageDimensionsMigrationReason, offset: number) => {
        const key = `${reason}:${offset}`;
        if (diagnosticKeys.has(key)) return;
        diagnosticKeys.add(key);
        let line = 0;
        let end = originalLines.length;
        while (line + 1 < end) {
            const middle = Math.floor((line + end) / 2);
            if (originalLines[middle] <= offset) line = middle;
            else end = middle;
        }
        diagnostics.push({
            code: 'IMAGE_DIMENSIONS_NOT_MIGRATED',
            reason,
            message: `Image dimensions left unchanged: ${reason}.`,
            offset,
            line: line + 1,
            column: offset - originalLines[line] + 1,
            ...(options.path === undefined ? {} : {path: options.path}),
        });
    };
    return {diagnostics, diagnostic};
}

/**
 * Migrate proven legacy image dimensions without running document preprocessing.
 *
 * @param source - Original Markdown; untouched ranges retain their exact bytes.
 * @param options - Optional diagnostic label; never a filesystem input.
 * @returns Original-offset edits, migrated source and explicit skipped-candidate diagnostics.
 */
export function migrateImageDimensions(
    source: string,
    options: ImageDimensionsMigrationOptions = {},
): ImageDimensionsMigrationResult {
    const {normalized, offsets} = normalizeSource(source);
    const input = shieldFrontmatter(normalized);
    const starts = lineStarts(input);
    const spans = new WeakMap<Token, ImageSizeSpan>();
    const rejected = new Map<string, Set<number>>();
    const md = createParser(false, false, {
        image: (span, token) => spans.set(token, span),
        rejected: (text, _imageStart, sizeStart) => {
            if (!rejected.has(text)) rejected.set(text, new Set());
            rejected.get(text)?.add(sizeStart);
        },
    });
    const tokens = md.parse(input, {});
    const {diagnostics, diagnostic} = createDiagnostics(source, options);
    const modes: Mode[] = [
        [false, false],
        [false, true],
        [true, false],
        [true, true],
    ].map(([generalAttrs, styling]) => {
        const parser = createParser(generalAttrs, styling);
        const parsed = proof(parser, input);
        if (parsed.env.references) Object.freeze(parsed.env.references);
        return {md: parser, source: parsed, paragraphs: paragraphs(parsed.tokens)};
    });
    let remaining = 32;
    const equivalent = (output: string, bounded: boolean): boolean | undefined => {
        if (bounded && remaining === 0) return undefined;
        const candidateInput = shieldFrontmatter(normalizeSource(output).normalized);
        for (const mode of modes) {
            if (bounded && remaining === 0) return undefined;
            if (bounded) remaining--;
            try {
                if (proof(mode.md, candidateInput).signature !== mode.source.signature)
                    return false;
            } catch {
                return false;
            }
        }
        return true;
    };
    const wholeCandidate = (candidate: readonly ImageDimensionsEdit[]) => {
        if (remaining === 0) return undefined;
        return equivalent(apply(source, candidate), true);
    };
    const candidates = collect(tokens, spans);
    const counts = new WeakMap<Token, number>();
    for (const {inline} of candidates) counts.set(inline, (counts.get(inline) ?? 0) + 1);
    const bases = new WeakMap<Token, number | undefined>();
    const baseOf = (inline: Token) => {
        if (!bases.has(inline)) bases.set(inline, inlineOffset(inline, input, starts));
        return bases.get(inline);
    };
    const isolated = paragraphs(tokens);
    const local = new WeakMap<Token, {start: number; source: string; before: Proof[]} | null>();
    const localEquivalent = (
        span: ImageSizeSpan,
        inline: Token,
        base: number,
    ): boolean | undefined => {
        if (!inline.map || counts.get(inline) !== 1 || !isolated.has(paragraphKey(inline.map)))
            return undefined;
        if (!local.has(inline)) {
            const start = starts[inline.map[0]];
            const block = input.slice(start, starts[inline.map[1]] ?? input.length);
            const before: Proof[] = [];
            try {
                for (const mode of modes) {
                    const original = mode.paragraphs.get(paragraphKey(inline.map));
                    const parsed = proof(mode.md, block, mode.source.env.references);
                    if (
                        !original ||
                        parsed.tokens.length !== 3 ||
                        JSON.stringify(canonicalTokens(parsed.tokens)) !==
                            JSON.stringify(canonicalTokens(original)) ||
                        mode.md.renderer.render(parsed.tokens, mode.md.options, parsed.env) !==
                            mode.md.renderer.render(original, mode.md.options, mode.source.env)
                    ) {
                        local.set(inline, null);
                        return undefined;
                    }
                    before.push(parsed);
                }
            } catch {
                local.set(inline, null);
                return undefined;
            }
            local.set(inline, {start, source: block, before});
        }
        const block = local.get(inline);
        if (!block) return undefined;
        const proposed = dimensionEdits(span, base, (offset) => offset - block.start);
        if (
            proposed.some(
                (edit) =>
                    /[\r\n]/.test(block.source.slice(edit.start, edit.end)) ||
                    /[\r\n]/.test(edit.replacement),
            )
        )
            return undefined;
        const candidate = apply(block.source, proposed);
        for (let index = 0; index < modes.length; index++) {
            try {
                const after = proof(modes[index].md, candidate, modes[index].source.env.references);
                if (after.tokens.length !== 3 || after.signature !== block.before[index].signature)
                    return false;
            } catch {
                return false;
            }
        }
        return true;
    };
    const edits: ImageDimensionsEdit[] = [];
    for (const {span, inline, nested} of candidates) {
        const base = baseOf(inline);
        const fallback = offsets[starts[inline.map?.[0] ?? 0]];
        const offset = base === undefined ? fallback : offsets[base + span.sizeStart];
        const failure = candidateFailure({span, inline, nested}, base);
        if (failure) {
            diagnostic(failure, failure === 'nested-image' ? fallback : offset);
        } else if (base !== undefined) {
            const candidate = dimensionEdits(span, base, (offset) => offsets[offset]);
            const localProof = localEquivalent(span, inline, base);
            const accepted = localProof === undefined ? wholeCandidate(candidate) : localProof;
            if (accepted) {
                edits.push(...candidate);
            } else {
                diagnostic(
                    accepted === undefined
                        ? 'equivalence-budget-exceeded'
                        : 'equivalence-check-failed',
                    offset,
                );
            }
        }
    }
    for (const {inline, sizeStart} of rejectedCandidates(tokens, rejected)) {
        const base = baseOf(inline);
        diagnostic(
            base === undefined ? 'ambiguous-source-range' : 'unsupported-legacy-form',
            offsets[base === undefined ? starts[inline.map?.[0] ?? 0] : base + sizeStart],
        );
    }
    htmlImageDiagnostics(input, tokens, starts, (offset) =>
        diagnostic('html-disabled-image', offsets[offset]),
    );
    edits.sort((a, b) => a.start - b.start);
    const output = apply(source, edits);
    if (
        edits.length &&
        (edits.some((edit, index) => index > 0 && edit.start < edits[index - 1].end) ||
            !equivalent(output, false))
    ) {
        for (const edit of edits.filter((item) => item.end > item.start)) {
            diagnostic('equivalence-check-failed', edit.start);
        }
        return {
            output: source,
            edits: [],
            diagnostics: diagnostics.sort((a, b) => a.offset - b.offset),
        };
    }
    return {output, edits, diagnostics: diagnostics.sort((a, b) => a.offset - b.offset)};
}
