import type {Token} from 'markdown-it' with {'resolution-mode': 'import'};
import type {MarkdownIt, StateBlock} from '../typings';
import type {DeprecationReporter} from '../deprecation';
import type {Logger} from '../log';
import type {CellData, RowPositions} from '../plugins/table/positions';
import type {YfmTablePluginOptions} from '../plugins/table/types';

import DefaultMarkdownIt from 'markdown-it';

import {LogLevels} from '../log';
import tablePlugin from '../plugins/table';
import {getTableRowPositions, isOpenTableOrder} from '../plugins/table/positions';

export type {YfmTablePluginOptions} from '../plugins/table/types';

export interface TableAlignmentMigrationOptions {
    readonly path?: string;
    readonly table?: Readonly<YfmTablePluginOptions>;
}

export interface TableAlignmentEdit {
    /** Zero-based UTF-16 offsets into the original source; end is exclusive. */
    readonly start: number;
    readonly end: number;
    readonly replacement: string;
}

export type TableAlignmentMigrationReason =
    | 'mixed-attributes'
    | 'existing-cell-attributes'
    | 'conflicting-alignment'
    | 'unknown-alignment'
    | 'multiline-cell'
    | 'nested-or-spanning-table'
    | 'ambiguous-content'
    | 'unclosed-table'
    | 'equivalence-check-failed';

export interface TableAlignmentMigrationDiagnostic {
    readonly code: 'TABLE_ALIGNMENT_NOT_MIGRATED';
    readonly reason: TableAlignmentMigrationReason;
    readonly message: string;
    readonly offset: number;
    readonly line: number;
    readonly column: number;
    readonly path?: string;
}

export interface TableAlignmentMigrationResult {
    readonly output: string;
    readonly edits: readonly TableAlignmentEdit[];
    readonly diagnostics: readonly TableAlignmentMigrationDiagnostic[];
}

interface CapturedTable extends RowPositions {
    start: number;
    level: number;
}

interface Candidate {
    cell: CellData;
    suffix: RegExpExecArray;
    raw: string;
}

const alignments = new Set([
    'top-left',
    'top-center',
    'top-right',
    'center',
    'bottom-left',
    'bottom-right',
]);

// Migration is pure: parsing must not report deprecations or mutate collected logs.
const quietReporter: DeprecationReporter = {
    warn() {},
    reset() {},
    compatibility: () => 'current',
};

const quietLog: Logger = {
    warn() {},
    error() {},
    info() {},
    LogLevels,
    get: () => ({info: [], warn: [], error: [], disabled: []}),
    add() {},
    clear() {},
    isEmpty: () => true,
};

function normalizeSource(source: string) {
    let normalized = '';
    const offsets: number[] = [];
    for (let index = 0; index < source.length; index++) {
        offsets.push(index);
        const char = source[index];
        if (char === '\r') {
            normalized += '\n';
            if (source[index + 1] === '\n') {
                index++;
            }
        } else {
            normalized += char === '\0' ? '\uFFFD' : char;
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

function sourceLineStarts(source: string): number[] {
    const starts = [0];
    for (let index = 0; index < source.length; index++) {
        if (source[index] === '\n') {
            starts.push(index + 1);
        }
    }
    return starts;
}

function shieldBlocks(source: string): string {
    const protectedTypes = new Set(['code_block', 'fence', 'html_block']);
    const tokens = new DefaultMarkdownIt({html: true}).parse(source, {});
    const lineStarts = sourceLineStarts(source);
    let result = source;
    for (const token of tokens.reverse()) {
        if (protectedTypes.has(token.type) && token.map) {
            const start = lineStarts[token.map[0]];
            const end = lineStarts[token.map[1]] ?? source.length;
            result =
                result.slice(0, start) +
                result.slice(start, end).replace(/[^\n]/g, ' ') +
                result.slice(end);
        }
    }
    return result;
}

function createParser(options: TableAlignmentMigrationOptions, captures?: CapturedTable[]) {
    const md = new DefaultMarkdownIt({html: true}) as MarkdownIt;
    md.use(tablePlugin, {...options.table, log: quietLog, deprecations: quietReporter});
    if (captures) {
        md.block.ruler.before(
            'yfm_table',
            'capture_table_alignment',
            (state, start, end, silent) => {
                const sourceState = state as StateBlock;
                const position = state.bMarks[start] + state.tShift[start];
                if (
                    !silent &&
                    state.sCount[start] - state.blkIndent < 4 &&
                    isOpenTableOrder(state.src, position)
                ) {
                    captures.push({
                        ...getTableRowPositions(
                            sourceState,
                            position,
                            state.eMarks[end],
                            start,
                            options.table,
                        ),
                        start: position,
                        level: state.level,
                    });
                }
                return false;
            },
        );
    }
    return md;
}

function candidates(capture: CapturedTable, source: string, protectedSource: string): Candidate[] {
    const cells = [...capture.rows.flatMap(({cols}) => cols), ...capture.unclosedCells];
    return cells.flatMap((cell) => {
        const raw = source.slice(cell.start.pos, cell.end.pos);
        const suffix = /[ \t]*\{([^{}\n]*cell-align-[^{}\n]*)\}[ \t\n]*$/.exec(raw);
        if (!suffix) {
            return [];
        }
        const start = cell.start.pos + suffix.index;
        const end = start + suffix[0].length;
        return source.slice(start, end) === protectedSource.slice(start, end)
            ? [{cell, suffix, raw}]
            : [];
    });
}

function hasExcludedStructure(tokens: Token[]): boolean {
    return (
        tokens.filter(({type}) => type === 'yfm_table_open').length > 1 ||
        tokens.some(
            (token) => token.attrGet('colspan') !== null || token.attrGet('rowspan') !== null,
        )
    );
}

function canonicalTokens(tokens: Token[]): unknown {
    return tokens.map((token) => ({
        type: token.type,
        tag: token.tag,
        nesting: token.nesting,
        attrs: token.attrs
            ?.filter(([name]) => name !== 'data-align')
            .sort(([first], [second]) => first.localeCompare(second)),
        content: token.content,
        markup: token.markup,
        hidden: token.hidden,
        children: token.children ? canonicalTokens(token.children) : null,
    }));
}

function applyEdits(source: string, edits: readonly TableAlignmentEdit[]): string {
    let output = source;
    for (const edit of [...edits].sort((first, second) => second.start - first.start)) {
        output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
    }
    return output;
}

function hasPlainContent(content: string, md: MarkdownIt): boolean {
    if (!content.trim() || /[{}]/.test(content)) {
        return false;
    }
    const tokens = md.parse(content, {});
    if (
        tokens.length !== 3 ||
        tokens[0].type !== 'paragraph_open' ||
        tokens[1].type !== 'inline' ||
        tokens[2].type !== 'paragraph_close'
    ) {
        return false;
    }
    const allowed = new Set([
        'text',
        'code_inline',
        'em_open',
        'em_close',
        'strong_open',
        'strong_close',
        's_open',
        's_close',
    ]);
    return (tokens[1].children ?? []).every(
        (token) =>
            allowed.has(token.type) && (token.type !== 'text' || !token.content.includes('`')),
    );
}

function tableReason(
    capture: CapturedTable,
    captures: CapturedTable[],
    found: Candidate[],
    source: string,
): TableAlignmentMigrationReason | undefined {
    if (capture.endOfTable === null) {
        return 'unclosed-table';
    }
    const parent = captures.some(
        (other) =>
            other !== capture &&
            other.start < capture.start &&
            other.pos >= capture.pos &&
            other.endOfTable !== null,
    );
    const spanning =
        capture.rows.some(({cols}) =>
            cols.some(({start, end}) => /^[>^]$/.test(source.slice(start.pos, end.pos).trim())),
        ) || found.some(({raw, suffix}) => /^[>^]$/.test(raw.slice(0, suffix.index).trim()));
    if (capture.nested || parent || spanning) {
        return 'nested-or-spanning-table';
    }
    return capture.level > 0 ? 'ambiguous-content' : undefined;
}

function inspectCandidate(
    {cell, suffix, raw}: Candidate,
    plainParser: MarkdownIt,
): {alignment: string} | {reason: TableAlignmentMigrationReason} {
    const alignment = /^\s*\.cell-align-([a-z-]+)\s*$/.exec(suffix[1]);
    if (!alignment) {
        return {reason: 'mixed-attributes'};
    }
    if (!alignments.has(alignment[1])) {
        return {reason: 'unknown-alignment'};
    }
    if (cell.start.pos !== cell.markerEnd.pos) {
        if (cell.rawAttrs.align !== undefined && cell.rawAttrs.align !== alignment[1]) {
            return {reason: 'conflicting-alignment'};
        }
        return {reason: 'existing-cell-attributes'};
    }
    if (cell.start.line !== cell.end.line) {
        return {reason: 'multiline-cell'};
    }
    const body = raw.slice(0, suffix.index);
    if (!hasPlainContent(body, plainParser) || /\\$/.test(body)) {
        return {reason: 'ambiguous-content'};
    }
    return {alignment: alignment[1]};
}

/**
 * Migrate unambiguous YFM table alignment suffixes without evaluating a document.
 * @param source - Original Markdown; offsets and unedited text retain its line endings.
 * @param options - Diagnostic label and the table's existing splitter options.
 * @returns Source-preserving edits and diagnostics for candidates requiring manual review.
 */
export function migrateTableAlignment(
    source: string,
    options: TableAlignmentMigrationOptions = {},
): TableAlignmentMigrationResult {
    const {normalized, offsets} = normalizeSource(source);
    const input = shieldBlocks(shieldFrontmatter(normalized));
    const captures: CapturedTable[] = [];
    createParser(options, captures).parse(input, {});
    const plainParser = new DefaultMarkdownIt({html: true});
    const proofParser = createParser(options);
    const diagnostics: TableAlignmentMigrationDiagnostic[] = [];
    const edits: TableAlignmentEdit[] = [];
    const lineStarts = sourceLineStarts(normalized);
    const diagnose = (candidate: Candidate, reason: TableAlignmentMigrationReason) => {
        const position = candidate.cell.start.pos + candidate.suffix.index;
        let line = 0;
        while (lineStarts[line + 1] !== undefined && lineStarts[line + 1] <= position) {
            line++;
        }
        diagnostics.push({
            code: 'TABLE_ALIGNMENT_NOT_MIGRATED',
            reason,
            message: `Table alignment was left unchanged: ${reason}. Review the cell manually.`,
            offset: offsets[position],
            line: line + 1,
            column: position - lineStarts[line] + 1,
            ...(options.path === undefined ? {} : {path: options.path}),
        });
    };
    for (const capture of captures) {
        const found = candidates(capture, normalized, input);
        if (!found.length) {
            continue;
        }
        const reason = tableReason(capture, captures, found, input);
        if (reason) {
            found.forEach((candidate) => diagnose(candidate, reason));
            continue;
        }
        const originalStart = offsets[capture.start];
        const originalEnd = offsets[capture.pos];
        const originalTable = source.slice(originalStart, originalEnd);
        const originalTokens = proofParser.parse(originalTable, {});
        // Standard Markdown masking can hide an indented table inside a real YFM cell.
        // Check the actual unmasked table before considering any edits to its cells.
        if (hasExcludedStructure(originalTokens)) {
            found.forEach((candidate) => diagnose(candidate, 'nested-or-spanning-table'));
            continue;
        }
        const proposed: TableAlignmentEdit[] = [];
        const proposedCandidates: Candidate[] = [];
        for (const candidate of found) {
            const {cell, suffix, raw} = candidate;
            const inspected = inspectCandidate(candidate, plainParser);
            if ('reason' in inspected) {
                diagnose(candidate, inspected.reason);
                continue;
            }
            const suffixStart = cell.start.pos + suffix.index;
            const suffixEnd = cell.end.pos - (/[ \t]*$/.exec(raw)?.[0].length ?? 0);
            proposed.push(
                {
                    start: offsets[cell.markerEnd.pos],
                    end: offsets[cell.markerEnd.pos],
                    replacement: `::{align="${inspected.alignment}"}`,
                },
                {start: offsets[suffixStart], end: offsets[suffixEnd], replacement: ''},
            );
            proposedCandidates.push(candidate);
        }
        if (!proposed.length) {
            continue;
        }
        const relativeEdits = proposed.map((edit) => ({
            ...edit,
            start: edit.start - originalStart,
            end: edit.end - originalStart,
        }));
        const before = canonicalTokens(originalTokens);
        const after = canonicalTokens(
            proofParser.parse(applyEdits(originalTable, relativeEdits), {}),
        );
        if (JSON.stringify(before) === JSON.stringify(after)) {
            edits.push(...proposed);
        } else {
            proposedCandidates.forEach((candidate) =>
                diagnose(candidate, 'equivalence-check-failed'),
            );
        }
    }
    edits.sort((first, second) => first.start - second.start);
    diagnostics.sort((first, second) => first.offset - second.offset);
    return {output: applyEdits(source, edits), edits, diagnostics};
}
