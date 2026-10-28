import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {ParserEnv} from '../typings';
import type {ImageSizeObserver, ImageSizeSpan} from '../plugins/imsize/positions';

import MarkdownIt from 'markdown-it';
import attrs from 'markdown-it-attrs';

import {imageWithSize} from '../plugins/imsize/plugin';

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
    | 'equivalence-check-failed';

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

function normalizeSource(source: string) {
    let normalized = '';
    const offsets: number[] = [];
    for (let index = 0; index < source.length; index++) {
        offsets.push(index);
        if (source[index] === '\r') {
            normalized += '\n';
            if (source[index + 1] === '\n') {
                index++;
            }
        } else {
            normalized += source[index] === '\0' ? '\uFFFD' : source[index];
        }
    }
    offsets.push(source.length);
    return {normalized, offsets};
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

function createParser(generalAttrs: boolean, styling: boolean, observer?: ImageSizeObserver) {
    const md = new MarkdownIt({html: true});
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

function signature(source: string, generalAttrs: boolean, styling: boolean): string {
    const md = createParser(generalAttrs, styling);
    const env: ParserEnv = {};
    const tokens = md.parse(shieldFrontmatter(normalizeSource(source).normalized), env);
    return JSON.stringify({
        tokens: canonicalTokens(tokens),
        html: md.renderer.render(tokens, md.options, env),
        css: env.additionalOptionsCssWhiteList,
    });
}

function apply(source: string, edits: readonly ImageDimensionsEdit[]): string {
    return [...edits]
        .sort((a, b) => b.start - a.start)
        .reduce(
            (output, edit) =>
                output.slice(0, edit.start) + edit.replacement + output.slice(edit.end),
            source,
        );
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
    offsets: number[],
): ImageDimensionsEdit[] {
    const dimensions = [span.width && `width=${span.width}`, span.height && `height=${span.height}`]
        .filter(Boolean)
        .join(' ');
    return [
        {
            start: offsets[base + span.sizeStart - 1],
            end: offsets[base + span.sizeEnd],
            replacement: '',
        },
        ...(dimensions
            ? [
                  {
                      start: offsets[base + span.imageEnd],
                      end: offsets[base + span.imageEnd],
                      replacement: `{${dimensions}}`,
                  },
              ]
            : []),
    ];
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
    const rejected: {source: string; sizeStart: number}[] = [];
    const md = createParser(false, false, {
        image: (span, token) => spans.set(token, span),
        rejected: (text, _imageStart, sizeStart) => rejected.push({source: text, sizeStart}),
    });
    const tokens = md.parse(input, {});
    const diagnostics: ImageDimensionsMigrationDiagnostic[] = [];
    const diagnostic = (reason: ImageDimensionsMigrationReason, offset: number) => {
        if (diagnostics.some((item) => item.reason === reason && item.offset === offset)) {
            return;
        }
        const prefix = source.slice(0, offset);
        const lines = prefix.split(/\r\n|\r|\n/);
        diagnostics.push({
            code: 'IMAGE_DIMENSIONS_NOT_MIGRATED',
            reason,
            message: `Image dimensions left unchanged: ${reason}.`,
            offset,
            line: lines.length,
            column: lines[lines.length - 1].length + 1,
            ...(options.path === undefined ? {} : {path: options.path}),
        });
    };
    const modes = [
        [false, false],
        [false, true],
        [true, false],
        [true, true],
    ];
    const signatures = modes.map(([generalAttrs, styling]) =>
        signature(source, generalAttrs, styling),
    );
    const equivalent = (output: string) =>
        modes.every(
            ([generalAttrs, styling], index) =>
                signature(output, generalAttrs, styling) === signatures[index],
        );
    const edits: ImageDimensionsEdit[] = [];
    for (const {span, inline, nested} of collect(tokens, spans)) {
        const base = inlineOffset(inline, input, starts);
        const fallback = offsets[starts[inline.map?.[0] ?? 0]];
        const offset = base === undefined ? fallback : offsets[base + span.sizeStart];
        if (nested || span.source !== inline.content) {
            diagnostic('nested-image', fallback);
        } else if (base === undefined) {
            diagnostic('ambiguous-source-range', fallback);
        } else if (span.adjacentAttributes) {
            diagnostic('existing-attributes', offset);
        } else if ([span.width, span.height].some((value) => !/^(?:[0-9]+%?)?$/.test(value))) {
            diagnostic('noncanonical-dimensions', offset);
        } else {
            const candidate = dimensionEdits(span, base, offsets);
            if (equivalent(apply(source, candidate))) {
                edits.push(...candidate);
            } else {
                diagnostic('equivalence-check-failed', offset);
            }
        }
    }
    for (const rejectedImage of rejected) {
        for (const inline of tokens.filter(
            (token) => token.type === 'inline' && token.content === rejectedImage.source,
        )) {
            const base = inlineOffset(inline, input, starts);
            diagnostic(
                base === undefined ? 'ambiguous-source-range' : 'unsupported-legacy-form',
                offsets[
                    base === undefined
                        ? starts[inline.map?.[0] ?? 0]
                        : base + rejectedImage.sizeStart
                ],
            );
        }
    }
    edits.sort((a, b) => a.start - b.start);
    const output = apply(source, edits);
    if (edits.length && !equivalent(output)) {
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
